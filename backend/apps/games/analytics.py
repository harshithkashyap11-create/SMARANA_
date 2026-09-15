"""Descriptive, non-diagnostic summaries of real game sessions."""

from collections import defaultdict
from datetime import timedelta
from typing import Any

from django.utils import timezone

from apps.games.models import GameSession
from apps.patients.models import PatientProfile


def summary(patient: PatientProfile, window: int) -> dict[str, Any]:
    window = window if window in {7, 30, 90} else 30
    sessions = list(
        GameSession.objects.filter(
            patient=patient,
            guest_mode=False,
            ended_at__gte=timezone.now() - timedelta(days=window),
        ).select_related("game")
    )
    grouped: dict[str, list[GameSession]] = defaultdict(list)
    for session in sessions:
        for domain in session.game.cognitive_domains:
            grouped[domain].append(session)
    domains = []
    for domain, rows in sorted(grouped.items()):
        completed = [row for row in rows if row.metrics.get("completed", False)]
        accuracies = [
            float(row.metrics["accuracy"]) for row in completed if "accuracy" in row.metrics
        ]
        reactions = [
            float(row.metrics["mean_reaction_ms"])
            for row in completed
            if "mean_reaction_ms" in row.metrics
        ]
        chronological = sorted(completed, key=lambda row: row.ended_at)
        trend = "insufficient_data"
        if len(chronological) >= 5:
            values = [float(row.metrics.get("accuracy", 0)) for row in chronological]
            mean_x = (len(values) - 1) / 2
            mean_y = sum(values) / len(values)
            slope = sum((index - mean_x) * (value - mean_y) for index, value in enumerate(values))
            trend = "improving" if slope > 0 else "declining" if slope < 0 else "stable"
        rounds = sum(max(1, int(row.metrics.get("rounds", 1))) for row in rows)
        domains.append(
            {
                "domain": domain,
                "sessions": len(rows),
                "mean_accuracy": sum(accuracies) / len(accuracies) if accuracies else None,
                "mean_reaction_ms": sum(reactions) / len(reactions) if reactions else None,
                "mistakes": sum(int(row.metrics.get("mistakes", 0)) for row in rows),
                "hints_per_round": sum(int(row.metrics.get("hints_used", 0)) for row in rows)
                / rounds,
                "level_path": [row.level for row in chronological],
                "trend": trend,
            }
        )
    return {
        "window_days": window,
        "domains": domains,
        "sessions": [
            {
                "id": str(row.id),
                "game": row.game.name,
                "level": row.level,
                "completed": bool(row.metrics.get("completed", False)),
                "accuracy": row.metrics.get("accuracy"),
                "mean_reaction_ms": row.metrics.get("mean_reaction_ms"),
                "ended_at": row.ended_at,
            }
            for row in sessions
        ],
    }
