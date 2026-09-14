"""T020 profile, family, consent, and audit API coverage."""

from unittest.mock import Mock

import pytest
from rest_framework.test import APIClient

from apps.audit.models import AuditEvent
from apps.patients.media import media_url
from apps.patients.models import ConsentSettings, FamilyMember
from apps.shared.tests.factories import CareAssignmentFactory, FamilyMemberFactory


def _patient_url(care_scenario: dict[str, object], suffix: str) -> str:
    return f"/api/v1/patients/{care_scenario['patient'].id}/{suffix}/"


@pytest.mark.django_db
def test_primary_caregiver_updates_life_history_but_not_doctor_fields(
    api: APIClient, care_scenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(care_scenario["caregiver"])

    response = api.patch(
        _patient_url(care_scenario, "profile"),
        {"known_places": [{"name": "Guwahati", "note": "Home"}], "max_difficulty_level": 9},
        format="json",
    )

    assert response.status_code == 200
    patient.refresh_from_db()
    assert patient.known_places == [{"name": "Guwahati", "note": "Home"}]
    assert patient.max_difficulty_level is None
    event = AuditEvent.objects.get(target_id=patient.id, action="update")
    assert event.changes["known_places"] == [[], patient.known_places]
    assert "max_difficulty_level" not in event.changes


@pytest.mark.django_db
def test_doctor_updates_caps_but_not_life_history(api: APIClient, care_scenario) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(care_scenario["doctor"])

    response = api.patch(
        _patient_url(care_scenario, "profile"),
        {"max_difficulty_level": 4, "session_cap_minutes": 20, "known_places": ["ignored"]},
        format="json",
    )

    assert response.status_code == 200
    patient.refresh_from_db()
    assert patient.max_difficulty_level == 4
    assert patient.session_cap_minutes == 20
    assert patient.known_places == []


@pytest.mark.django_db
def test_non_primary_caregiver_cannot_patch_profile(api: APIClient, care_scenario) -> None:
    CareAssignmentFactory(
        patient=care_scenario["patient"],
        caregiver=care_scenario["other_caregiver"],
        is_primary=False,
    )
    api.force_authenticate(care_scenario["other_caregiver"])

    response = api.patch(
        _patient_url(care_scenario, "profile"), {"known_places": []}, format="json"
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_unassigned_profile_is_404(api: APIClient, care_scenario) -> None:
    api.force_authenticate(care_scenario["caregiver"])
    response = api.patch(
        f"/api/v1/patients/{care_scenario['other_patient'].id}/profile/",
        {"known_places": []},
        format="json",
    )
    assert response.status_code == 404


@pytest.mark.django_db
def test_family_crud_is_audited_and_delete_is_soft(api: APIClient, care_scenario) -> None:
    api.force_authenticate(care_scenario["caregiver"])
    url = _patient_url(care_scenario, "family")
    created = api.post(
        url,
        {
            "name": "Mina",
            "relationship": "daughter",
            "relationship_label": "Jiyori",
            "phone": "+91 100",
        },
        format="json",
    )
    assert created.status_code == 201
    detail_url = f"{url}{created.data['id']}/"

    updated = api.patch(detail_url, {"order": 2}, format="json")
    deleted = api.delete(detail_url)

    assert updated.status_code == 200
    assert deleted.status_code == 204
    assert not FamilyMember.objects.filter(pk=created.data["id"]).exists()
    assert FamilyMember.all_objects.filter(pk=created.data["id"]).exists()
    assert set(
        AuditEvent.objects.filter(target_id=created.data["id"]).values_list("action", flat=True)
    ) == {"create", "update", "delete"}


@pytest.mark.django_db
def test_doctor_family_list_omits_phone(api: APIClient, care_scenario) -> None:
    FamilyMemberFactory(patient=care_scenario["patient"], phone="+91 999")
    api.force_authenticate(care_scenario["doctor"])

    response = api.get(_patient_url(care_scenario, "family"))

    assert response.status_code == 200
    assert len(response.data) == 1
    assert "phone" not in response.data[0]
    assert response.data[0]["name"]


@pytest.mark.django_db
def test_patient_can_read_family_but_not_create(api: APIClient, care_scenario) -> None:
    FamilyMemberFactory(patient=care_scenario["patient"])
    api.force_authenticate(care_scenario["patient"].user)

    read = api.get(_patient_url(care_scenario, "family"))
    create = api.post(
        _patient_url(care_scenario, "family"),
        {"name": "No", "relationship": "friend"},
        format="json",
    )

    assert read.status_code == 200
    assert create.status_code == 403


@pytest.mark.django_db
def test_patient_and_primary_caregiver_can_update_consent(api: APIClient, care_scenario) -> None:
    url = _patient_url(care_scenario, "consent")
    api.force_authenticate(care_scenario["patient"].user)
    patient_update = api.patch(url, {"use_memories_in_quiz": True}, format="json")
    api.force_authenticate(care_scenario["caregiver"])
    caregiver_update = api.patch(url, {"share_mood_with_doctor": True}, format="json")

    assert patient_update.status_code == 200
    assert caregiver_update.status_code == 200
    consent = ConsentSettings.objects.get(patient=care_scenario["patient"])
    assert consent.use_memories_in_quiz is True
    assert consent.share_mood_with_doctor is True
    assert consent.updated_by == care_scenario["caregiver"]
    assert AuditEvent.objects.filter(target_id=consent.id, action="update").count() == 2


@pytest.mark.django_db
def test_non_primary_caregiver_cannot_patch_consent(api: APIClient, care_scenario) -> None:
    CareAssignmentFactory(
        patient=care_scenario["patient"],
        caregiver=care_scenario["other_caregiver"],
        is_primary=False,
    )
    api.force_authenticate(care_scenario["other_caregiver"])

    response = api.patch(
        _patient_url(care_scenario, "consent"),
        {"share_memories_with_doctor": True},
        format="json",
    )

    assert response.status_code == 403


@pytest.mark.django_db
def test_doctor_cannot_read_consent(api: APIClient, care_scenario) -> None:
    api.force_authenticate(care_scenario["doctor"])
    response = api.get(_patient_url(care_scenario, "consent"))
    assert response.status_code == 403


def test_media_url_requests_ten_minute_expiry() -> None:
    storage = Mock()
    storage.url.return_value = "https://media.example/family/photo.jpg?signed=yes"
    file = Mock(name="family/2026/09/photo.jpg", storage=storage)
    file.name = "family/2026/09/photo.jpg"

    assert media_url(file) == storage.url.return_value
    storage.url.assert_called_once_with(file.name, expire=600)
