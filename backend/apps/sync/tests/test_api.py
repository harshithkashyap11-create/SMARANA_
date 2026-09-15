from uuid import uuid4

import pytest

from apps.routines.models import RoutineItem
from apps.sync.models import IdempotencyRecord, SyncRejection

pytestmark = pytest.mark.django_db


def _item(patient_id: str, *, source: str = "patient") -> dict:
    object_id = str(uuid4())
    return {
        "outbox_id": str(uuid4()),
        "model": "routine_item",
        "object_id": object_id,
        "patient_id": patient_id,
        "idempotency_key": f"routine_item:{object_id}:1",
        "payload": {
            "id": object_id,
            "patient_id": patient_id,
            "title": "Drink water",
            "source": source,
            "time_of_day": "16:00:00",
            "start_date": "2026-09-15",
        },
    }


def test_push_is_idempotent(api, care_scenario) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    item = _item(str(patient.id))

    first = api.post("/api/v1/sync/push/", {"items": [item]}, format="json")
    replay = api.post("/api/v1/sync/push/", {"items": [item]}, format="json")

    assert first.status_code == replay.status_code == 200
    assert RoutineItem.objects.filter(id=item["object_id"]).count() == 1
    assert IdempotencyRecord.objects.filter(key=item["idempotency_key"]).count() == 1


def test_push_rejects_foreign_patient_and_disallowed_source(api, care_scenario) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    foreign = _item(str(care_scenario["other_patient"].id))
    caregiver_owned = _item(str(patient.id), source="caregiver")

    response = api.post(
        "/api/v1/sync/push/",
        {"items": [foreign, caregiver_owned]},
        format="json",
    )

    assert response.status_code == 200
    assert [item["code"] for item in response.data["rejected"]] == ["forbidden", "forbidden"]
    assert SyncRejection.objects.filter(user=patient.user).count() == 2


def test_push_rejects_unknown_models(api, care_scenario) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    item = _item(str(patient.id))
    item["model"] = "memory"

    response = api.post("/api/v1/sync/push/", {"items": [item]}, format="json")

    assert response.status_code == 200
    assert response.data["rejected"][0]["code"] == "validation"
