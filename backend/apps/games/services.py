from typing import Any

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.audit.services import audit
from apps.games.dda import DdaConfig, DifficultyStateData, SessionSummary, next_difficulty
from apps.games.models import DifficultyChange, DifficultyState, GameDefinition, GameSession
from apps.patients.models import PatientProfile

METRIC_TYPES = {
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
    required = game.metrics_schema.get("required", [])
    missing = [key for key in required if key not in metrics]
    invalid = [
        key
        for key, value in metrics.items()
        if key in METRIC_TYPES and not isinstance(value, METRIC_TYPES[key])
    ]
    if missing or invalid or not 0 <= metrics.get("accuracy", 0) <= 1:
        raise ValidationError(
            {"metrics": f"Invalid metrics (missing={missing}, invalid={invalid})."}
        )
    if len(str(metrics.get("raw_events", []))) > 20_000:
        raise ValidationError({"metrics": "raw_events must be no larger than 20 KB."})


@transaction.atomic
def save_session(
    patient: PatientProfile, actor: Any, data: dict[str, Any]
) -> tuple[GameSession, DifficultyState, DifficultyChange | None, str]:
    game = GameDefinition.objects.get(key=data["game_key"], active=True)
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
