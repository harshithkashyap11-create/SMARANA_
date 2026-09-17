from collections.abc import Mapping
from datetime import timedelta
from uuid import uuid4

import pytest
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.test import APIClient

from apps.games.models import GameDefinition
from apps.shared.tests.types import CareScenario

pytestmark = pytest.mark.django_db


def test_favourites_are_patient_scoped_and_ordered(
    api: APIClient, care_scenario: CareScenario
) -> None:
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

    def push(p: Mapping[str, object]) -> Response:
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
