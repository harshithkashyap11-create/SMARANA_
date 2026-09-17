"""T105–T108 regression coverage."""

from datetime import date, time, timedelta
from uuid import uuid4

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.alerts.rules import low_mood_3d
from apps.audit.models import AuditEvent
from apps.clinical.models import ClinicalNote
from apps.clinical.selectors import doctor_dashboard
from apps.games.analytics import summary
from apps.games.models import DifficultyState
from apps.games.tests.test_api import payload
from apps.patients.models import ConsentSettings
from apps.routines.conflicts import conflicts
from apps.routines.models import MoodLog
from apps.shared.tests.factories import RoutineItemFactory
from apps.shared.tests.types import CareScenario

pytestmark = pytest.mark.django_db


def test_guest_preserves_existing_and_absent_difficulty(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    url = f"/api/v1/patients/{patient.id}/game-sessions/"
    before = summary(patient, 7)
    dashboard = doctor_dashboard(care_scenario["doctor"])
    assert api.post(url, {**payload(), "guest_mode": True}, format="json").status_code == 201
    assert not DifficultyState.objects.filter(patient=patient).exists()
    assert summary(patient, 7) == before
    assert doctor_dashboard(care_scenario["doctor"]) == dashboard
    assert api.post(url, payload(), format="json").status_code == 201
    state = DifficultyState.objects.get(patient=patient)
    snapshot = (state.level, state.window, state.updated_at)
    before = summary(patient, 7)
    dashboard = doctor_dashboard(care_scenario["doctor"])
    assert api.post(url, {**payload(), "guest_mode": True}, format="json").status_code == 201
    state.refresh_from_db()
    assert (state.level, state.window, state.updated_at) == snapshot
    assert summary(patient, 7) == before
    assert doctor_dashboard(care_scenario["doctor"]) == dashboard


def test_caregiver_can_only_post_practice_for_assigned_patient(
    api: APIClient, care_scenario: CareScenario
) -> None:
    api.force_authenticate(care_scenario["caregiver"])
    url = f"/api/v1/patients/{care_scenario['patient'].id}/game-sessions/"
    assert api.post(url, payload(), format="json").status_code == 404
    assert api.post(url, {**payload(), "guest_mode": True}, format="json").status_code == 201
    url = f"/api/v1/patients/{care_scenario['other_patient'].id}/game-sessions/"
    assert api.post(url, {**payload(), "guest_mode": True}, format="json").status_code == 404


def test_wellness_consent_and_audited_correction(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    url = f"/api/v1/patients/{patient.id}/mood-logs/"
    api.force_authenticate(patient.user)
    response = api.post(
        url, {"mood": "low", "logged_at": timezone.now().isoformat()}, format="json"
    )
    assert response.status_code == 201
    log_id = response.data["id"]
    api.force_authenticate(care_scenario["doctor"])
    assert api.get(url).status_code == 404
    ConsentSettings.objects.update_or_create(
        patient=patient, defaults={"share_mood_with_doctor": True}
    )
    assert api.get(url).status_code == 200
    assert api.post(url, {"mood": "ok"}, format="json").status_code == 403
    api.force_authenticate(care_scenario["caregiver"])
    assert api.patch(f"{url}{log_id}/", {"mood": "good"}, format="json").status_code == 200
    event = AuditEvent.objects.get(target_id=log_id, action="wellness.corrected")
    assert event.changes["before"]["mood"] == "low"
    assert event.changes["after"]["mood"] == "good"
    assert event.changes["after"]["source"] == "patient"
    other_url = f"/api/v1/patients/{care_scenario['other_patient'].id}/mood-logs/"
    assert api.get(other_url).status_code == 404


def test_offline_wellness_push_replay_and_pull(api: APIClient, care_scenario: CareScenario) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    now = timezone.now().isoformat()
    items = []
    entries: list[tuple[str, dict[str, object]]] = [
        ("mood_log", {"mood": "ok", "logged_at": now}),
        (
            "sleep_log",
            {"date": "2026-09-16", "bed_time": "22:00", "wake_time": "07:00", "quality": 4},
        ),
    ]
    for model, fields in entries:
        log_id = str(uuid4())
        items.append(
            {
                "outbox_id": log_id,
                "object_id": log_id,
                "patient_id": str(patient.id),
                "model": model,
                "idempotency_key": log_id,
                "payload": {
                    "id": log_id,
                    "patient_id": str(patient.id),
                    "device_updated_at": now,
                    **fields,
                },
            }
        )
    for _ in range(2):
        response = api.post("/api/v1/sync/push/", {"items": items}, format="json")
        assert len(response.data["accepted"]) == 2
        assert not response.data["rejected"]
    assert patient.mood_logs.count() == patient.sleep_logs.count() == 1
    response = api.get("/api/v1/sync/pull/")
    assert len(response.data["records"]["mood_logs"]) == 1
    assert len(response.data["records"]["sleep_logs"]) == 1


def test_low_mood_requires_three_consecutive_latest_daily_entries(
    care_scenario: CareScenario,
) -> None:
    patient = care_scenario["patient"]
    now = timezone.now()
    for offset in range(3):
        MoodLog.objects.create(
            patient=patient,
            logged_at=now - timedelta(days=offset),
            mood="low",
            source="patient",
            device_updated_at=now,
            idempotency_key=str(uuid4()),
        )
    assert low_mood_3d(patient, now) is not None
    MoodLog.objects.create(
        patient=patient,
        logged_at=now,
        mood="good",
        source="patient",
        device_updated_at=now,
        idempotency_key=str(uuid4()),
    )
    assert low_mood_3d(patient, now) is None


def test_conflicts_respect_days_dates_and_edit_self(care_scenario: CareScenario) -> None:
    patient = care_scenario["patient"]
    row = RoutineItemFactory.create(
        patient=patient,
        time_of_day=time(8),
        days_of_week=[0],
        start_date=date(2026, 9, 14),
        end_date=date(2026, 9, 14),
    )
    fields = {
        "time_of_day": time(8, 10),
        "days_of_week": [0],
        "start_date": date(2026, 9, 14),
        "end_date": None,
    }
    assert conflicts(patient, fields)[0]["id"] == str(row.id)
    assert not conflicts(patient, {**fields, "time_of_day": time(8, 11)})
    assert not conflicts(patient, {**fields, "days_of_week": [1]})
    assert not conflicts(patient, {**fields, "start_date": date(2026, 9, 21)})
    assert not conflicts(patient, fields, row)


def test_timeline_order_filters_permissions_and_private_notes(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    for visibility in ["care_team", "doctor_only"]:
        ClinicalNote.objects.create(
            patient=patient,
            author=care_scenario["doctor"],
            category="general",
            text=visibility,
            visibility=visibility,
        )
    api.force_authenticate(care_scenario["caregiver"])
    url = f"/api/v1/patients/{patient.id}/timeline/"
    response = api.get(url)
    assert response.status_code == 200
    assert [x["at"] for x in response.data] == sorted(x["at"] for x in response.data)
    assert any(x["title"] == "care_team" for x in response.data)
    assert not any(x["title"] == "doctor_only" for x in response.data)
    assert api.get(url, {"to": "2000-01-01"}).data == []
    assert api.get(url, {"from": "invalid"}).status_code == 400
    assert (
        api.get(f"/api/v1/patients/{care_scenario['other_patient'].id}/timeline/").status_code
        == 404
    )
    api.force_authenticate(patient.user)
    assert api.get(url).status_code == 403


def test_sleep_validation_consent_and_care_team_contacts(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(care_scenario["caregiver"])
    url = f"/api/v1/patients/{patient.id}/sleep-logs/"
    fields = {"date": "2026-09-16", "bed_time": "22:00", "wake_time": "07:00", "quality": 4}
    response = api.post(url, fields, format="json")
    assert response.status_code == 201
    assert response.data["source"] == "caregiver"
    assert api.post(url, {**fields, "quality": 6}, format="json").status_code == 400
    team = api.get(f"/api/v1/patients/{patient.id}/care-team/")
    assert {row["id"] for row in team.data} == {
        str(care_scenario["caregiver"].id),
        str(care_scenario["doctor"].id),
    }
    assert all("email" in row and "phone" in row for row in team.data)
    api.force_authenticate(care_scenario["doctor"])
    assert api.get(url).status_code == 404
    ConsentSettings.objects.update_or_create(
        patient=patient, defaults={"share_mood_with_doctor": True}
    )
    assert api.get(url).status_code == 200
