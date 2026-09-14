import pytest
from django.utils import timezone

from apps.games.models import DifficultyState, GameDefinition, GameSession

pytestmark = pytest.mark.django_db


def payload() -> dict:
    return {
        "game_key": "memory_match",
        "seed": "stable-seed",
        "level": 1,
        "started_at": timezone.now().isoformat(),
        "ended_at": timezone.now().isoformat(),
        "challenge_mode": False,
        "metrics": {
            "accuracy": 0.75,
            "mean_reaction_ms": 1200,
            "mistakes": 1,
            "hints_used": 0,
            "rounds": 4,
            "duration_ms": 5000,
            "completed": True,
            "abandoned_reason": None,
            "fatigue_flags": [],
        },
    }


def test_patient_session_creates_minimum_difficulty_state(api, care_scenario) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    response = api.post(f"/api/v1/patients/{patient.id}/game-sessions/", payload(), format="json")
    assert response.status_code == 201
    assert response.data["state"]["level"] == 1
    assert response.data["change"] is None
    assert response.data["message_key"] == "dda.same_next_time"
    assert DifficultyState.objects.filter(patient=patient, level=1).exists()
    assert GameSession.objects.filter(patient=patient).exists()


def test_invalid_metrics_are_rejected(api, care_scenario) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    invalid = payload()
    invalid["metrics"] = {"accuracy": 2}
    response = api.post(f"/api/v1/patients/{patient.id}/game-sessions/", invalid, format="json")
    assert response.status_code == 400
    assert GameSession.objects.count() == 0


def test_patient_cannot_create_another_patients_session(api, care_scenario) -> None:
    patient = care_scenario["patient"]
    other = care_scenario["other_patient"]
    api.force_authenticate(patient.user)
    response = api.post(f"/api/v1/patients/{other.id}/game-sessions/", payload(), format="json")
    assert response.status_code == 404


def test_authenticated_users_can_list_catalog(api, care_scenario) -> None:
    api.force_authenticate(care_scenario["caregiver"])
    response = api.get("/api/v1/games/")
    assert response.status_code == 200
    assert {game["key"] for game in response.data} == {
        "memory_match",
        "sequence_recall",
        "object_sorting",
        "tea_garden_attention",
        "bihu_rhythm_recall",
        "daily_life_sequencing",
    }
    assert GameDefinition.objects.count() == 6
