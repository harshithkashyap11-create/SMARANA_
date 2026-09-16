from datetime import timedelta
from uuid import uuid4

import pytest
from django.utils import timezone

from apps.games.models import GameDefinition

pytestmark = pytest.mark.django_db


def test_favourites_are_patient_scoped_and_ordered(api, care_scenario):
    patient = care_scenario["patient"]
    game = GameDefinition.objects.get(key="word_pairs")
    stamp = timezone.now()
    payload = {
        "id": str(patient.id),
        "patient_id": str(patient.id),
        "favourites": [{"kind": "game", "id": game.key}],
        "device_updated_at": stamp.isoformat(),
    }
    api.force_authenticate(patient.user)

    def push(p):
        return api.post(
            "/api/v1/sync/push/",
            {
                "items": [
                    {
                        "outbox_id": str(uuid4()),
                        "model": "patient_profile_favourites",
                        "object_id": str(patient.id),
                        "patient_id": str(patient.id),
                        "payload": p,
                        "idempotency_key": str(uuid4()),
                    }
                ]
            },
            format="json",
        )

    assert len(push(payload).data["accepted"]) == 1
    assert (
        len(
            push(
                {
                    **payload,
                    "favourites": [],
                    "device_updated_at": (stamp - timedelta(days=1)).isoformat(),
                }
            ).data["accepted"]
        )
        == 1
    )
    patient.refresh_from_db()
    assert patient.favourites == payload["favourites"]
    assert (
        len(push({**payload, "id": str(care_scenario["other_patient"].id)}).data["rejected"]) == 1
    )
    assert (
        api.get("/api/v1/sync/pull/").data["records"]["profile"][0]["favourites"]
        == payload["favourites"]
    )
