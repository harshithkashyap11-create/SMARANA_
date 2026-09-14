"""Pure dynamic-difficulty function shared conceptually with the web client."""

from dataclasses import asdict, dataclass, replace
from typing import Literal

Reason = Literal[
    "promote", "hold", "demote", "doctor_lock", "cap", "insufficient_data", "guest", "fatigue_hold"
]


@dataclass(frozen=True)
class SessionSummary:
    level: int
    accuracy: float
    meanReactionMs: float
    mistakes: int
    hintsUsed: int
    rounds: int
    completed: bool
    challengeMode: bool
    guestMode: bool
    fatigueFlagged: bool


@dataclass(frozen=True)
class DifficultyStateData:
    level: int
    window: list[dict]
    lockedByDoctor: bool
    capLevel: int | None
    minLevel: int
    maxLevel: int
    lockedByName: str = ""


@dataclass(frozen=True)
class DdaConfig:
    windowSize: int = 3
    promoteAccuracy: float = 0.85
    demoteAccuracy: float = 0.60
    reactionWorsenRatio: float = 1.25
    hintPenaltyPerRound: float = 0.5


@dataclass(frozen=True)
class DifficultyChangeData:
    fromLevel: int
    toLevel: int
    reasonCode: Reason
    explanation: str


@dataclass(frozen=True)
class DdaResult:
    state: DifficultyStateData
    change: DifficultyChangeData
    messageKey: str


def _result(
    state: DifficultyStateData,
    to_level: int,
    reason: Reason,
    explanation: str,
    message: str,
    *,
    clear: bool = False,
) -> DdaResult:
    return DdaResult(
        replace(state, level=to_level, window=[] if clear else state.window),
        DifficultyChangeData(state.level, to_level, reason, explanation),
        message,
    )


def next_difficulty(
    state: DifficultyStateData, session: SessionSummary, config: DdaConfig
) -> DdaResult:
    if session.guestMode:
        return _result(
            state,
            state.level,
            "guest",
            "Guest sessions do not affect difficulty.",
            "dda.thanks_for_playing",
        )
    window = [*state.window, asdict(session)][-config.windowSize :]
    updated = replace(state, window=window)
    if state.lockedByDoctor:
        name = state.lockedByName or "the care team"
        return _result(
            updated,
            state.level,
            "doctor_lock",
            f"Difficulty is locked by Dr. {name}.",
            "dda.same_next_time",
        )
    if len(window) < config.windowSize:
        return _result(
            updated,
            state.level,
            "insufficient_data",
            "More sessions are needed before adjusting difficulty.",
            "dda.same_next_time",
        )
    if session.fatigueFlagged or not session.completed:
        return _result(
            updated,
            state.level,
            "fatigue_hold",
            "Held because the latest session was cut short or a break was suggested.",
            "dda.thanks_for_playing",
        )
    all_low = all(item["accuracy"] < config.demoteAccuracy for item in window)
    earlier_mean = sum(item["meanReactionMs"] for item in window[:-1]) / len(window[:-1])
    slower = session.meanReactionMs >= config.reactionWorsenRatio * earlier_mean
    frequent = session.mistakes >= session.rounds / 2
    if all_low and (slower or frequent):
        target = max(state.minLevel, state.level - 1)
        why = "reaction time increased" if slower else "mistakes were frequent"
        return _result(
            updated,
            target,
            "demote",
            f"Accuracy stayed under 60% across 3 rounds while {why}.",
            "dda.easier_next_time",
            clear=target != state.level,
        )
    all_high = all(item["accuracy"] >= config.promoteAccuracy for item in window)
    low_hints = all(
        item["hintsUsed"] / max(item["rounds"], 1) < config.hintPenaltyPerRound for item in window
    )
    mean_rt = sum(item["meanReactionMs"] for item in window) / len(window)
    if all_high and low_hints and session.meanReactionMs <= 1.1 * mean_rt:
        ceiling = min(
            state.maxLevel, state.capLevel if state.capLevel is not None else state.maxLevel
        )
        target = min(ceiling, state.level + 1)
        if target == state.level and state.capLevel is not None:
            return _result(
                updated,
                target,
                "cap",
                f"Reached the doctor-set cap of level {state.capLevel}.",
                "dda.same_next_time",
                clear=True,
            )
        if target != state.level:
            return _result(
                updated,
                target,
                "promote",
                "Accuracy stayed at or above 85% with few hints.",
                "dda.harder_next_time",
                clear=True,
            )
    return _result(
        updated, state.level, "hold", "Performance within target range.", "dda.same_next_time"
    )
