from pathlib import Path
from uuid import uuid4

import pytest
from django.core.management import call_command
from pytest_django.fixtures import Settings
from rest_framework.test import APIClient

from apps.games.models import DifficultyState, GameDefinition, GameSession
from apps.games.notebook_dda import recommend
from apps.games.tests.test_api import payload
from apps.games.tests.test_performance import event
from apps.shared.tests.types import CareScenario

pytest.importorskip("sklearn")
pytest.importorskip("pandas")

ARTIFACT = str(Path(__file__).resolve().parents[3] / "dda_artifacts/dda-synthetic-demo-v1.joblib")


def test_downloaded_cloud_export_parity(settings: Settings) -> None:
    settings.DDA_MODEL_ARTIFACT = ARTIFACT
    call_command("validate_dda_model")


@pytest.mark.parametrize("accuracy,errors,expected", [(0.97, 0, 1), (0.3, 3, -1)])
def test_real_rf_promotes_and_demotes(accuracy: float, errors: int, expected: int) -> None:
    history = [
        dict(
            accuracy=0.97,
            response_time=1.2,
            hints_used=0,
            rounds=4,
            early_exit=False,
            adjustment=0,
            raw_prediction=1,
        )
        for _ in range(4)
    ]
    data = event()
    data.update(
        accuracy=accuracy,
        errors=errors,
        reaction_time_ms=1200,
        rounds_completed=4,
        session_duration_sec=20,
    )
    decision = recommend(ARTIFACT, data, history, "none")
    assert decision["reason"] == "model"
    assert decision["adjustment"] == expected


@pytest.mark.django_db
@pytest.mark.parametrize("locked,cap,expected", [(False, 5, 3), (True, 5, 2), (False, 2, 2)])
def test_real_model_round_session_persistence_and_doctor_limits(
    api: APIClient,
    care_scenario: CareScenario,
    settings: Settings,
    locked: bool,
    cap: int,
    expected: int,
) -> None:
    settings.DDA_MODEL_ARTIFACT = ARTIFACT
    patient = care_scenario["patient"]
    patient.accessibility = {"dda_condition": "none"}
    patient.save()
    game = GameDefinition.objects.get(key="visual_search")
    state = DifficultyState.objects.create(
        patient=patient,
        game=game,
        level=2,
        locked_by_doctor=locked,
        cap_level=cap,
    )
    api.force_authenticate(patient.user)
    for _ in range(4):
        previous = payload()
        GameSession.objects.create(
            patient=patient,
            game=game,
            level=2,
            seed="fictional-test",
            started_at=previous["started_at"],
            ended_at=previous["ended_at"],
            metrics={
                **previous["metrics"],
                "accuracy": 0.97,
                "mistakes": 0,
                "dda": {"raw_prediction": 1},
            },
        )
    sid = str(uuid4())
    data = event()
    data.update(
        session_id=sid,
        accuracy=0.97,
        reaction_time_ms=1200,
        rounds_completed=4,
        session_duration_sec=20,
    )
    response = api.post("/api/v1/game-events/", data, format="json")
    assert response.status_code == 200
    assert response.data["engine_version"] == "notebook-rf-v1"
    assert response.data["difficulty"] == expected
    final = payload()
    final.update(id=sid, game_key=game.key, level=expected)
    final["metrics"].update(accuracy=0.97, mistakes=0, duration_ms=20000)
    url = f"/api/v1/patients/{patient.id}/game-sessions/"
    saved = api.post(url, final, format="json")
    assert saved.status_code == 201
    assert saved.data["state"]["level"] == expected
    assert api.post(url, final, format="json").data["state"]["level"] == expected
    state.refresh_from_db()
    assert state.level == expected
    assert GameSession.objects.get(id=sid).metrics["dda"]["final_difficulty"] == expected


@pytest.mark.django_db
def test_demo_rule_fallback_adapts_outside_training_domain(
    api: APIClient, care_scenario: CareScenario, settings: Settings
) -> None:
    patient = care_scenario["patient"]
    api.force_authenticate(patient.user)
    previous = payload()
    previous.update(game_key="visual_search")
    previous["metrics"].update(accuracy=0.97, mistakes=0)
    url = f"/api/v1/patients/{patient.id}/game-sessions/"
    # Collect rule-engine history before switching on the optional demo model.
    for _ in range(3):
        assert api.post(url, previous, format="json").status_code == 201
    state = DifficultyState.objects.get(patient=patient, game__key="visual_search")
    state.window = [
        {
            "level": state.level,
            "accuracy": 0.97,
            "meanReactionMs": 1200,
            "mistakes": 0,
            "hintsUsed": 0,
            "rounds": 4,
            "completed": True,
            "challengeMode": False,
            "guestMode": False,
            "fatigueFlagged": False,
        }
        for _ in range(2)
    ]
    state.save()
    patient.accessibility = {"dda_condition": "none"}
    patient.save()
    settings.DDA_MODEL_ARTIFACT = ARTIFACT
    settings.DDA_RULE_FALLBACK = True
    data = event()
    data.update(difficulty=state.level, reaction_time_ms=1200, session_duration_sec=90)
    response = api.post("/api/v1/game-events/", data, format="json")
    assert response.status_code == 200
    assert response.data["engine_version"] == "deterministic-session-v1"
    assert response.data["model_status"] == "model_out_of_domain"
    assert response.data["adjustment"] == 1
