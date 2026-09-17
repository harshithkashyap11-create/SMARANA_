#!/usr/bin/env python3
"""Generate reproducible, non-clinical DDA training rows for a demo model."""

import argparse
import json
import random
from datetime import UTC, datetime, timedelta
from pathlib import Path

GAMES = (
    "sequence_recall", "memory_match", "find_the_change", "object_sorting",
    "daily_routine", "word_recall", "visual_search", "pattern_completion",
    "spatial_recall", "attention_tap", "association_game", "personal_memory",
)
CONDITIONS = ("none", "none", "none", "low_vision", "motor_tremor")


def clipped(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def adjustment(history: list[dict[str, object]], accuracy: float, early_exit: bool) -> int:
    """A transparent simulated care-policy label, never a clinical label."""
    if early_exit or accuracy < 0.55:
        return -1
    recent = history[-3:]
    if len(recent) == 3 and all(float(row["accuracy"]) >= 0.85 for row in recent) and accuracy >= 0.85:
        return 1
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--patients", type=int, default=120)
    parser.add_argument("--sessions-per-game", type=int, default=16)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if args.patients < 10 or args.sessions_per_game < 6:
        raise ValueError("Use at least 10 patients and 6 sessions per game.")

    rng = random.Random(args.seed)
    rows: list[dict[str, object]] = []
    origin = datetime(2026, 1, 1, tzinfo=UTC)
    for patient_index in range(args.patients):
        ability = rng.uniform(-0.25, 0.25)
        condition = rng.choice(CONDITIONS)
        for game_index, game_id in enumerate(GAMES):
            level = rng.randint(1, 3)
            history: list[dict[str, object]] = []
            for session_index in range(args.sessions_per_game):
                load = (level - 1) * 0.11
                fatigue = max(0, session_index - 10) * 0.012
                accuracy = clipped(0.77 + ability - load - fatigue + rng.gauss(0, 0.11), 0.05, 1.0)
                early_exit = accuracy < 0.42 or rng.random() < (0.015 + fatigue / 3)
                rounds = rng.randint(3, 6)
                hints = max(0, int(round((1 - accuracy) * rounds + rng.gauss(0, 0.6))))
                reaction_ms = int(clipped(1500 + level * 380 - ability * 800 + fatigue * 1500 + rng.gauss(0, 260), 500, 6000))
                event = {
                    "difficulty": level,
                    "accuracy": round(accuracy, 4),
                    "reaction_time_ms": reaction_ms,
                    "hints_used": hints,
                    "rounds_completed": 0 if early_exit else rounds,
                    "early_exit": early_exit,
                    "session_duration_sec": int(clipped(rounds * reaction_ms / 1000 * 1.8, 20, 600)),
                    "errors": max(0, rounds - int(round(accuracy * rounds))),
                }
                target = adjustment(history, accuracy, early_exit)
                next_level = int(clipped(level + target, 1, 5))
                rows.append({
                    "patient_id": f"synthetic-{patient_index:03d}",
                    "game_id": game_id,
                    "timestamp": (origin + timedelta(days=session_index, minutes=game_index)).isoformat(),
                    "performance": event,
                    "condition": condition,
                    "applied_adjustment": next_level - level,
                    "target_adj": target,
                    "provenance": "synthetic-demo-policy-v1",
                })
                history.append({"accuracy": accuracy})
                level = next_level
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(rows, indent=2))
    print(f"Wrote {len(rows)} synthetic demo rows to {args.output}")


if __name__ == "__main__":
    main()
