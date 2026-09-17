from datetime import datetime, timedelta
from uuid import uuid4

import pytest
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.patients.models import FamilyMember
from apps.routines.models import RoutineItem
from apps.routines.services import reminder_id_for
from apps.shared.tests.types import CareScenario

pytestmark = pytest.mark.django_db


def test_pull_contains_rules_family_profile_and_honors_since(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    family = FamilyMember.objects.create(patient=patient, name="Family", relationship="friend")
    FamilyMember.objects.create(
        patient=care_scenario["other_patient"], name="Foreign", relationship="friend"
    )
    first = api.get("/api/v1/sync/pull/")
    assert first.status_code == 200
    assert first.data["patient_id"] == str(patient.id)
    assert [str(x["id"]) for x in first.data["records"]["family_members"]] == [str(family.id)]
    assert first.data["records"]["profile"][0]["id"] == str(patient.id)
    cursor = first.data["server_time"]
    second = api.get("/api/v1/sync/pull/", {"since": cursor})
    assert second.data["records"]["family_members"] == []
    family.delete()
    third = api.get("/api/v1/sync/pull/", {"since": cursor})
    assert {"model": "family_members", "id": str(family.id)} in third.data["records"]["deleted"]


@pytest.mark.parametrize("since", ["garbage", "2026-01-01T00:00:00", "2999-01-01T00:00:00Z"])
def test_pull_rejects_invalid_cursor(
    api: APIClient, care_scenario: CareScenario, since: str
) -> None:
    api.force_authenticate(care_scenario["patient"].user)
    assert api.get("/api/v1/sync/pull/", {"since": since}).status_code == 400


def test_response_to_locally_generated_reminder_materialises_server_record(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    day = timezone.localdate() - timedelta(days=5)
    rule = RoutineItem.objects.create(
        patient=patient,
        title="Walk",
        category="walk",
        time_of_day="09:00",
        days_of_week=list(range(7)),
        start_date=day,
        source="caregiver",
        created_by=care_scenario["caregiver"],
    )
    response_id = str(uuid4())
    response = api.post(
        "/api/v1/sync/push/",
        {
            "items": [
                {
                    "outbox_id": "response",
                    "model": "reminder_response",
                    "object_id": response_id,
                    "patient_id": str(patient.id),
                    "idempotency_key": f"reminder_response:{response_id}:1",
                    "payload": {
                        "id": response_id,
                        "patient_id": str(patient.id),
                        "reminder_id": str(reminder_id_for(rule.id, day)),
                        "action": "taken",
                        "responded_at": f"{day}T09:05:00+05:30",
                    },
                }
            ]
        },
        format="json",
    )
    assert response.data["rejected"] == []
    assert patient.routine_reminders.get(id=reminder_id_for(rule.id, day)).status == "taken"


def test_offline_accessibility_updates_are_validated_and_ordered(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    now = timezone.now()

    def push(settings: dict[str, object], updated: datetime) -> Response:
        return api.post(
            "/api/v1/sync/push/",
            {
                "items": [
                    {
                        "outbox_id": str(uuid4()),
                        "model": "accessibility",
                        "object_id": str(patient.id),
                        "patient_id": str(patient.id),
                        "idempotency_key": str(uuid4()),
                        "payload": {
                            "id": str(patient.id),
                            "patient_id": str(patient.id),
                            "settings": settings,
                            "device_updated_at": updated.isoformat(),
                        },
                    }
                ]
            },
            format="json",
        )

    assert push({"slow_speech": True}, now).data["rejected"] == []
    assert push({"slow_speech": False}, now - timedelta(minutes=1)).data["rejected"] == []
    assert push({"theme": "invalid"}, now + timedelta(seconds=1)).data["rejected"]
    patient.refresh_from_db()
    assert patient.accessibility["slow_speech"] is True


def test_offline_sos_replays_once_with_client_id(
    api: APIClient, care_scenario: CareScenario
) -> None:
    from apps.alerts.models import SosEvent

    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    event_id = str(uuid4())
    triggered = (timezone.now() - timedelta(minutes=5)).isoformat()
    item = {
        "outbox_id": str(uuid4()),
        "model": "sos_event",
        "object_id": event_id,
        "patient_id": str(patient.id),
        "idempotency_key": f"sos_event:{event_id}:1",
        "payload": {"id": event_id, "patient_id": str(patient.id), "triggered_at": triggered},
    }
    for _ in range(2):
        response = api.post("/api/v1/sync/push/", {"items": [item]}, format="json")
        assert response.status_code == 200
        assert len(response.data["accepted"]) == 1, response.data
    assert SosEvent.objects.filter(id=event_id).count() == 1
    assert SosEvent.objects.get(id=event_id).triggered_at.isoformat() == triggered
