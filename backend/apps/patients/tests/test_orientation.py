from datetime import timedelta

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from freezegun.api import FrozenDateTimeFactory
from rest_framework.test import APIClient

from apps.shared.tests.factories import FamilyMemberFactory, ReminderFactory
from apps.shared.tests.types import CareScenario


@pytest.mark.django_db
def test_orientation_returns_next_activity_and_deterministic_family_member(
    api: APIClient, care_scenario: CareScenario, frozen_now: FrozenDateTimeFactory
) -> None:
    del frozen_now
    patient = care_scenario["patient"]
    patient.home_label = "Guwahati home"
    patient.save(update_fields=["home_label"])
    FamilyMemberFactory.create(
        patient=patient,
        name="Mina",
        photo=SimpleUploadedFile("mina.jpg", b"photo", content_type="image/jpeg"),
    )
    ReminderFactory.create(
        patient=patient,
        routine_item__patient=patient,
        routine_item__title="Morning tea",
        scheduled_at=timezone.now() + timedelta(hours=1),
    )
    ReminderFactory.create(
        patient=patient,
        routine_item__patient=patient,
        routine_item__title="Tomorrow",
        scheduled_at=timezone.now() + timedelta(days=1),
    )
    api.force_authenticate(user=patient.user)

    first = api.get(f"/api/v1/patients/{patient.id}/orientation/")
    second = api.get(f"/api/v1/patients/{patient.id}/orientation/")

    assert first.status_code == 200
    assert first.data["greeting_key"] == "morning"
    assert first.data["home_label"] == "Guwahati home"
    assert first.data["next_activity"]["title"] == "Morning tea"
    assert first.data["family_member"]["name"] == "Mina"
    assert first.data["family_member"]["photo_url"]
    assert second.data["family_member"] == first.data["family_member"]


@pytest.mark.django_db
def test_orientation_has_nullable_optional_content(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(user=patient.user)

    response = api.get(f"/api/v1/patients/{patient.id}/orientation/")

    assert response.status_code == 200
    assert response.data["next_activity"] is None
    assert response.data["family_member"] is None
