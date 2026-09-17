import math
from typing import Any

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.audit.services import audit
from apps.games.dda import DdaConfig, DifficultyStateData, SessionSummary, next_difficulty
from apps.games.models import DifficultyChange, DifficultyState, GameDefinition, GameSession
from apps.patients.models import PatientProfile

METRIC_TYPES: dict[str, type | tuple[type, ...]] = {
    "accuracy": (int, float),
    "mean_reaction_ms": (int, float),
    "mistakes": int,
    "hints_used": int,
    "rounds": int,
    "duration_ms": (int, float),
    "completed": bool,
    "abandoned_reason": (str, type(None)),
    "fatigue_flags": list,
    "raw_events": list,
}


def validate_metrics(game: GameDefinition, metrics: dict[str, Any]) -> None:
    if not isinstance(metrics, dict):
        raise ValidationError({"metrics": "Expected an object."})
    required = set(game.metrics_schema.get("required", [])) | {
        "accuracy",
        "mean_reaction_ms",
        "mistakes",
        "hints_used",
        "rounds",
        "completed",
    }
    missing = [key for key in required if key not in metrics]
    invalid = [
        key
        for key, value in metrics.items()
        if key in METRIC_TYPES and not isinstance(value, METRIC_TYPES[key])
    ]
    numeric = {"accuracy", "mean_reaction_ms", "mistakes", "hints_used", "rounds", "duration_ms"}
    invalid.extend(
        key
        for key in numeric
        if key in metrics
        and (
            isinstance(metrics[key], bool)
            or not isinstance(metrics[key], (int, float))
            or not math.isfinite(metrics[key])
            or metrics[key] < 0
        )
    )
    if missing or invalid:
        raise ValidationError(
            {"metrics": f"Invalid metrics (missing={missing}, invalid={invalid})."}
        )
    if not 0 <= metrics.get("accuracy", 0) <= 1:
        raise ValidationError(
            {"metrics": f"Invalid metrics (missing={missing}, invalid={invalid})."}
        )
    if len(str(metrics.get("raw_events", []))) > 20_000:
        raise ValidationError({"metrics": "raw_events must be no larger than 20 KB."})


@transaction.atomic
def save_session(
    patient: PatientProfile, actor: User, data: dict[str, Any]
) -> tuple[GameSession, DifficultyState, DifficultyChange | None, str]:
    try:
        game = GameDefinition.objects.get(key=data["game_key"], active=True)
    except GameDefinition.DoesNotExist as exc:
        raise ValidationError({"game_key": "Game is unavailable."}) from exc
    from django.utils import timezone

    start, end = data.get("started_at"), data.get("ended_at")
    if (
        start is None
        or end is None
        or timezone.is_naive(start)
        or timezone.is_naive(end)
        or end < start
    ):
        raise ValidationError({"ended_at": "Use valid ordered, timezone-aware session dates."})
    if type(data.get("level")) is not int or not game.min_level <= data["level"] <= game.max_level:
        raise ValidationError({"level": "Choose a level within the game's range."})
    # Serialize first-time state creation and clinician updates for this patient.
    patient = PatientProfile.objects.select_for_update().get(pk=patient.pk)
    metrics = data["metrics"]
    validate_metrics(game, metrics)
    if data.get("guest_mode", False):
        state = DifficultyState.objects.filter(patient=patient, game=game).first()
        if state is None:
            state = DifficultyState(patient=patient, game=game, level=game.min_level, window=[])
    else:
        state, _ = DifficultyState.objects.select_for_update().get_or_create(
            patient=patient, game=game, defaults={"level": game.min_level}
        )
    session_fields = {"id": data["id"]} if data.get("id") else {}
    session = GameSession.objects.create(
        **session_fields,
        patient=patient,
        game=game,
        seed=data["seed"],
        level=data["level"],
        metrics=metrics,
        challenge_mode=data.get("challenge_mode", False),
        guest_mode=data.get("guest_mode", False),
        started_at=data["started_at"],
        ended_at=data["ended_at"],
    )
    if session.guest_mode:
        audit(actor, "create", session, patient)
        return session, state, None, "dda.thanks_for_playing"
    summary = SessionSummary(
        level=session.level,
        accuracy=metrics["accuracy"],
        meanReactionMs=metrics["mean_reaction_ms"],
        mistakes=metrics["mistakes"],
        hintsUsed=metrics["hints_used"],
        rounds=metrics["rounds"],
        completed=metrics["completed"],
        challengeMode=session.challenge_mode,
        guestMode=session.guest_mode,
        fatigueFlagged=bool(metrics.get("fatigue_flags")),
    )
    result = next_difficulty(
        DifficultyStateData(
            level=state.level,
            window=state.window,
            lockedByDoctor=state.locked_by_doctor,
            capLevel=min(
                value
                for value in (state.cap_level, patient.max_difficulty_level, game.max_level)
                if value is not None
            ),
            minLevel=game.min_level,
            maxLevel=game.max_level,
            lockedByName=state.locked_by_name,
        ),
        summary,
        DdaConfig(),
    )
    state.level, state.window = result.state.level, result.state.window
    state.save(update_fields=["level", "window", "updated_at"])
    change = None
    if result.change.fromLevel != result.change.toLevel or result.change.reasonCode in {
        "doctor_lock",
        "cap",
    }:
        change = DifficultyChange.objects.create(
            state=state,
            session=session,
            from_level=result.change.fromLevel,
            to_level=result.change.toLevel,
            reason_code=result.change.reasonCode,
            explanation=result.change.explanation,
        )
    audit(actor, "create", session, patient)
    return session, state, change, result.messageKey
