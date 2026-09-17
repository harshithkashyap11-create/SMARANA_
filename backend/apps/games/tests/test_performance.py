import uuid
from typing import Any
from unittest.mock import patch

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.models import DifficultyState, GamePerformanceEvent, GameSession
from apps.games.notebook_dda import build_features, recommend
from apps.games.tests.test_api import payload
from apps.shared.tests.types import CareScenario

pytestmark = pytest.mark.django_db


def event(game: str = "visual_search") -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "session_id": str(uuid.uuid4()),
        "game_id": game,
        "difficulty": 2,
        "accuracy": 0.9,
        "reaction_time_ms": 2000,
        "errors": 0,
        "hints_used": 0,
        "completed": False,
        "early_exit": False,
        "session_duration_sec": 30,
        "rounds_completed": 3,
        "timestamp": timezone.now().isoformat(),
    }


@pytest.mark.parametrize("game", ["sequence_recall", "visual_search", "personal_memory"])
def test_checkpoint_is_patient_scoped_and_idempotent(
    api: APIClient, care_scenario: CareScenario, game: str
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    data = event(game)
    first = api.post("/api/v1/game-events/", data, format="json")
    second = api.post("/api/v1/game-events/", data, format="json")
    assert first.status_code == second.status_code == 200
    assert first.data == second.data
    assert first.data["adjustment"] == 0  # Conservative cold start.
    assert GamePerformanceEvent.objects.get().patient_id == patient.id
    assert not DifficultyState.objects.exists()  # No double-counted session history.
    api.force_authenticate(care_scenario["other_patient"].user)
    assert api.post("/api/v1/game-events/", data, format="json").status_code == 400


def test_event_requires_patient_auth(api: APIClient, care_scenario: CareScenario) -> None:
    assert api.post("/api/v1/game-events/", event(), format="json").status_code == 401
    api.force_authenticate(care_scenario["caregiver"])
    assert api.post("/api/v1/game-events/", event(), format="json").status_code == 404


@pytest.mark.parametrize(
    "field,value",
    [
        ("accuracy", 2),
        ("difficulty", 6),
        ("errors", -1),
        ("reaction_time_ms", -1),
        ("rounds_completed", -2),
    ],
)
def test_event_validation(
    api: APIClient, care_scenario: CareScenario, field: str, value: int
) -> None:
    api.force_authenticate(care_scenario["patient"].user)
    data = event()
    data[field] = value
    assert api.post("/api/v1/game-events/", data, format="json").status_code == 400
    assert not GamePerformanceEvent.objects.exists()


def test_final_session_retry_does_not_adapt_twice(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    data = {**payload(), "id": str(uuid.uuid4())}
    url = f"/api/v1/patients/{patient.id}/game-sessions/"
    assert api.post(url, data, format="json").status_code == 201
    assert api.post(url, data, format="json").status_code == 201
    assert GameSession.objects.count() == 1
    assert len(DifficultyState.objects.get().window) == 1


def test_engine_failure_preserves_session(api: APIClient, care_scenario: CareScenario) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    with patch("apps.games.services.next_difficulty", side_effect=RuntimeError("test failure")):
        response = api.post(
            f"/api/v1/patients/{patient.id}/game-sessions/", payload(), format="json"
        )
    assert response.status_code == 201
    assert response.data["state"]["level"] == 1
    assert GameSession.objects.count() == 1


def test_notebook_features_use_only_past_real_metrics() -> None:
    history = [
        {
            "accuracy": 0.8,
            "response_time": 2,
            "hints_used": 1,
            "rounds": 4,
            "early_exit": False,
            "adjustment": 0,
        }
        for _ in range(6)
    ]
    features = build_features(event(), history, 3.6, "none")
    assert features["response_time"] == 2
    assert features["rolling_accuracy_3"] == pytest.approx(0.8)
    assert features["accuracy_trend"] == pytest.approx(0)
    assert features["recent_hint_rate"] == 0.25
    assert features["is_cold_start"] == 0
    assert features["current_difficulty"] == pytest.approx(0.325)
    assert recommend("/missing.joblib", event(), [], "none")["reason"] == "cold_start"
    assert recommend("/missing.joblib", event(), history, "none")["adjustment"] == 0
    with pytest.raises(ValueError):
        build_features(event(), history, 3.6, "unknown")


def test_live_recommendation_changes_next_round_once_and_isolates_game(
    api: APIClient, care_scenario: CareScenario
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    data = {**payload(), "game_key": "visual_search"}
    data["metrics"].update(accuracy=1, mistakes=0, hints_used=0)
    for _ in range(2):
        assert (
            api.post(
                f"/api/v1/patients/{patient.id}/game-sessions/", data, format="json"
            ).status_code
            == 201
        )
    checkpoint = event()
    checkpoint["difficulty"] = 1
    # The default checkpoint is slower than the prior 1200ms sessions: hold.
    slow = api.post("/api/v1/game-events/", checkpoint, format="json")
    assert slow.data["adjustment"] == 0
    checkpoint.update(id=str(uuid.uuid4()), reaction_time_ms=1200)
    first = api.post("/api/v1/game-events/", checkpoint, format="json")
    assert first.status_code == 200
    assert first.data["adjustment"] == 1
    second = {**checkpoint, "id": str(uuid.uuid4()), "difficulty": 2, "rounds_completed": 4}
    assert api.post("/api/v1/game-events/", second, format="json").data["adjustment"] == 0
    other_game = {**event("pattern_completion"), "difficulty": 1}
    assert api.post("/api/v1/game-events/", other_game, format="json").data["adjustment"] == 0
    assert len(DifficultyState.objects.get().window) == 2


def test_round_inference_exception_holds_and_persists(
    api: APIClient, care_scenario: CareScenario
) -> None:
    api.force_authenticate(care_scenario["patient"].user)
    with patch("apps.games.performance.next_difficulty", side_effect=RuntimeError("test failure")):
        response = api.post("/api/v1/game-events/", event(), format="json")
    assert response.status_code == 200
    assert response.data["adjustment"] == 0
    assert GamePerformanceEvent.objects.count() == 1
