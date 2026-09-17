"""Idempotent fictional warm-up data for the known hackathon account only."""

from datetime import timedelta
from typing import Any
from uuid import NAMESPACE_URL, uuid5

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.games.models import DifficultyState, GameDefinition, GameSession
from apps.games.services import save_session
from apps.patients.models import PatientProfile


class Command(BaseCommand):
    help = "Warm up DDA for fictional RAO1234; existing gameplay and doctor limits are preserved."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        try:
            patient = PatientProfile.objects.get(user__username="RAO1234")
        except PatientProfile.DoesNotExist as exc:
            raise CommandError("Run seed_demo first.") from exc
        patient.accessibility = {**patient.accessibility, "dda_condition": "none", "dda_demo": True}
        patient.save(update_fields=["accessibility", "updated_at"])
        count = 0
        for game in GameDefinition.objects.filter(active=True):
            # Never inject warm-up history into a game that has real demo play.
            if (
                GameSession.objects.filter(patient=patient, game=game)
                .exclude(seed__startswith="dda-demo:")
                .exists()
            ):
                continue
            DifficultyState.objects.get_or_create(
                patient=patient, game=game, defaults={"level": game.min_level}
            )
            for index in range(4):
                sid = uuid5(NAMESPACE_URL, f"smarana-dda-demo-v1:{patient.id}:{game.key}:{index}")
                if GameSession.objects.filter(id=sid).exists():
                    continue
                end = timezone.now() - timedelta(minutes=10 - index)
                save_session(
                    patient,
                    patient.user,
                    {
                        "id": sid,
                        "game_key": game.key,
                        "seed": f"dda-demo:{index}",
                        "level": game.min_level,
                        "started_at": end - timedelta(seconds=20),
                        "ended_at": end,
                        "metrics": {
                            "accuracy": 0.97,
                            "mean_reaction_ms": 1200,
                            "mistakes": 0,
                            "hints_used": 0,
                            "rounds": 4,
                            "duration_ms": 20000,
                            "completed": True,
                            "abandoned_reason": None,
                            "fatigue_flags": [],
                            "raw_events": [{"synthetic_demo": True}],
                        },
                    },
                )
                count += 1
        self.stdout.write(f"Fictional DDA warm-up: {count} sessions added to RAO1234 only.")
