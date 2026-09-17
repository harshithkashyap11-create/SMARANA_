"""Production boundary for the notebook's supervised RF pipeline.

No training, pandas history construction, or notebook execution happens at runtime.
Artifacts must carry the corrected feature contract and a training-only RT median.
"""

import importlib
import logging
import math
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)
FEATURE_COLUMNS = [
    "current_difficulty",
    "accuracy",
    "response_time",
    "hints_used",
    "early_exit",
    "rounds_this_session",
    "session_duration",
    "rolling_accuracy_3",
    "rolling_response_time_3",
    "accuracy_trend",
    "response_time_trend",
    "recent_hint_rate",
    "consecutive_errors",
    "consecutive_successes",
    "previous_adjustment",
    "difficulty_change_count_5",
    "recent_early_exit_rate",
    "is_cold_start",
    "condition",
]
FEATURE_CONTRACT = "smarana-history-v1"


def build_features(
    current: dict[str, Any], history: list[dict[str, Any]], rt_neutral: float, condition: str
) -> dict[str, Any]:
    """History oldest first, excludes current. Time units are seconds, not ms."""
    if condition not in {"none", "low_vision", "motor_tremor"}:
        raise ValueError("Accessibility context has not been collected")
    if not math.isfinite(rt_neutral) or rt_neutral <= 0:
        raise ValueError("Missing training RT baseline")
    past = history[-6:]
    recent = past[-3:]
    enough = len(recent) == 3

    def mean(rows: list[dict[str, Any]], key: str) -> float:
        return float(sum(row[key] for row in rows) / len(rows))

    acc = mean(recent, "accuracy") if enough else 0.65
    rt = mean(recent, "response_time") if enough else rt_neutral
    changes = [row.get("adjustment", 0) for row in history[-5:]]

    def streak(predicate: Any) -> int:
        count = 0
        for row in reversed(history):
            if not predicate(row["accuracy"]):
                break
            count += 1
        return count

    result = {
        "current_difficulty": 0.1 + (current["difficulty"] - 1) * 0.225,
        "accuracy": current["accuracy"],
        "response_time": current["reaction_time_ms"] / 1000,
        "hints_used": current["hints_used"],
        "early_exit": int(current["early_exit"]),
        "rounds_this_session": current["rounds_completed"],
        "session_duration": current["session_duration_sec"],
        "rolling_accuracy_3": acc,
        "rolling_response_time_3": rt,
        "accuracy_trend": acc - mean(past[:3], "accuracy") if len(past) == 6 else 0,
        "response_time_trend": rt - mean(past[:3], "response_time") if len(past) == 6 else 0,
        "recent_hint_rate": sum(row["hints_used"] for row in recent)
        / max(1, sum(row["rounds"] for row in recent))
        if enough
        else 0,
        "consecutive_errors": streak(lambda accuracy: accuracy < 0.55),
        "consecutive_successes": streak(lambda accuracy: accuracy > 0.75),
        "previous_adjustment": changes[-1] if changes else 0,
        "difficulty_change_count_5": sum(value != 0 for value in changes)
        if len(changes) == 5
        else 0,
        "recent_early_exit_rate": sum(row["early_exit"] for row in history[-5:]) / 5
        if len(history) >= 5
        else 0,
        "is_cold_start": int(len(history) < 3),
        "condition": condition,
    }
    if any(not math.isfinite(value) for key, value in result.items() if key != "condition"):
        raise ValueError("Non-finite feature")
    return {key: result[key] for key in FEATURE_COLUMNS}


def recommend(
    artifact_path: str, current: dict[str, Any], history: list[dict[str, Any]], condition: str
) -> dict[str, Any]:
    held = {"adjustment": 0, "engine_version": "notebook-rf-v1", "reason": "model_unavailable"}
    if len(history) < 3:
        return {**held, "reason": "cold_start"}
    try:
        # Only a deployment-controlled file is accepted; never a request-supplied pickle.
        joblib = importlib.import_module("joblib")
        pd = importlib.import_module("pandas")
        sklearn = importlib.import_module("sklearn")

        artifact = joblib.load(Path(artifact_path))
        metadata = artifact["metadata"]
        if (
            metadata["feature_columns"] != FEATURE_COLUMNS
            or metadata.get("feature_contract") != FEATURE_CONTRACT
            or metadata["library_versions"]["sklearn"] != sklearn.__version__
        ):
            raise ValueError("Artifact feature/library version mismatch")
        features = build_features(current, history, metadata["rt_neutral"], condition)
        schema = metadata["feature_schema"]
        for key in FEATURE_COLUMNS[:-1]:
            spec = schema[key]
            if not spec["min"] <= features[key] <= spec["max"]:
                raise ValueError(f"Out-of-domain feature: {key}")
        pipeline = artifact["pipeline"]
        confidence = float(
            max(pipeline.predict_proba(pd.DataFrame([features], columns=FEATURE_COLUMNS))[0])
        )
        prediction = pipeline.predict(pd.DataFrame([features], columns=FEATURE_COLUMNS))[0]
        if prediction not in {-1, 0, 1}:
            raise ValueError("Invalid model adjustment")
        adjustment = int(prediction) if confidence >= 0.6 else 0
        # Conservative replacement for the notebook's undefined safeguard function.
        if current["early_exit"] or current["accuracy"] < 0.55:
            adjustment = -1
        if adjustment > 0 and (
            features["consecutive_errors"] > 0
            or features["recent_early_exit_rate"] > 0.2
            or current["errors"] >= max(1, current["rounds_completed"] / 2)
        ):
            adjustment = 0
        # Notebook rate limits: 4 changes/10 sessions, 3-session cooldown after
        # increase, 1 after decrease, two consecutive increase signals.
        flags = [row.get("adjustment", 0) for row in history[-10:]]
        last_change = next((index for index, value in enumerate(reversed(flags)) if value), None)
        if sum(value != 0 for value in flags) >= 4:
            adjustment = 0
        elif adjustment == 1 and (last_change is not None and last_change < 3):
            adjustment = 0
        elif adjustment == 1 and history[-1].get("raw_prediction") != 1:
            adjustment = 0
        elif adjustment == -1 and last_change == 0 and not current["early_exit"]:
            adjustment = 0
        return {
            "adjustment": adjustment,
            "raw_prediction": int(prediction),
            "engine_version": "notebook-rf-v1",
            "model_version": metadata["model_version"],
            "reason": "model",
        }
    except Exception:
        logger.exception("Notebook DDA inference held difficulty")
        return held


def recommend_for_patient(
    patient: Any, game: Any, current: dict[str, Any], session_id: Any = None
) -> dict[str, Any]:
    from django.conf import settings

    from apps.games.models import GameSession

    sessions = GameSession.objects.filter(patient=patient, game=game, guest_mode=False)
    if session_id:
        sessions = sessions.exclude(id=session_id)
    history = []
    for session in sessions.order_by("ended_at", "id"):
        change = session.difficulty_changes.first()
        history.append(
            {
                "accuracy": session.metrics["accuracy"],
                "response_time": session.metrics["mean_reaction_ms"] / 1000,
                "hints_used": session.metrics["hints_used"],
                "rounds": session.metrics["rounds"],
                "early_exit": not session.metrics["completed"],
                "raw_prediction": session.metrics.get("dda", {}).get("raw_prediction", 0),
                "adjustment": change.to_level - change.from_level if change else 0,
            }
        )
    return recommend(
        settings.DDA_MODEL_ARTIFACT,
        current,
        history,
        patient.accessibility.get("dda_condition", ""),
    )
