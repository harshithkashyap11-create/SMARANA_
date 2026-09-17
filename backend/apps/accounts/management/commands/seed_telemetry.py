"""Idempotent, explicitly synthetic local demonstration data."""

from datetime import timedelta
from typing import Any

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import DoctorProfile, PatientCredential, User
from apps.games.models import DifficultyState, GameDefinition, GameSession
from apps.patients.models import CareAssignment, ConsentSettings, DoctorAssignment, PatientProfile

PASSWORD = "SmaranaDemo123!"


class Command(BaseCommand):
    help = "Seed 3 users, 5 caregivers, 2 doctors, 1 admin and synthetic game telemetry locally."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        if not settings.DEBUG:
            raise CommandError("Synthetic credentials are restricted to development settings.")
        call_command("seed_demo", stdout=self.stdout)
        patients = []
        for index, username in enumerate(["RAO1234", "USER2", "USER3"]):
            user, _ = User.objects.update_or_create(
                username=username,
                defaults={
                    "role": "patient",
                    "display_name": ["Rao", "Lakshmi", "Biren"][index],
                    "email": f"user{index + 1}@example.com",
                    "is_approved": True,
                },
            )
            user.set_password(PASSWORD)
            user.save()
            profile, _ = PatientProfile.objects.get_or_create(user=user)
            profile.cultural_notes = (
                "SYNTHETIC DEMO PERSON — not a real patient or clinical record."
            )
            profile.region = ["AS", "ML", "MN"][index]
            profile.save()
            ConsentSettings.objects.get_or_create(patient=profile)
            credential, _ = PatientCredential.objects.get_or_create(
                user=user, defaults={"login_id": username}
            )
            credential.set_pin("1234")
            credential.save()
            patients.append(profile)
        caregivers = []
        doctors = []
        for role, emails in [
            (
                "caregiver",
                ["priya@example.com"] + [f"caregiver{i}@example.com" for i in range(2, 6)],
            ),
            ("doctor", ["deka@example.com", "doctor2@example.com"]),
        ]:
            for index, email in enumerate(emails):
                user, _ = User.objects.update_or_create(
                    username=email,
                    defaults={
                        "email": email,
                        "role": role,
                        "display_name": f"Demo {role} {index + 1}",
                        "is_approved": True,
                    },
                )
                user.set_password(PASSWORD)
                user.save()
                if role == "doctor":
                    DoctorProfile.objects.get_or_create(
                        user=user, defaults={"verification_status": "demo_verified"}
                    )
                    doctors.append(user)
                else:
                    caregivers.append(user)
        for index, caregiver in enumerate(caregivers):
            CareAssignment.objects.update_or_create(
                patient=patients[index % 3],
                caregiver=caregiver,
                defaults={"active": True, "is_primary": index < 3},
            )
        for profile in patients:
            for doctor in doctors:
                DoctorAssignment.objects.update_or_create(
                    patient=profile, doctor=doctor, defaults={"active": True}
                )
            for game in GameDefinition.objects.filter(active=True):
                DifficultyState.objects.get_or_create(
                    patient=profile, game=game, defaults={"level": 3}
                )
                for day in range(14):
                    seed = f"synthetic-v1-{game.key}-{day}"
                    start = timezone.now().replace(
                        hour=10, minute=0, second=0, microsecond=0
                    ) - timedelta(days=day)
                    accuracy = round(0.65 + (13 - day) * 0.02, 2)
                    session, created = GameSession.objects.get_or_create(
                        patient=profile,
                        game=game,
                        seed=seed,
                        defaults={
                            "level": 3,
                            "started_at": start,
                            "ended_at": start + timedelta(minutes=4),
                            "metrics": {
                                "accuracy": accuracy,
                                "mean_reaction_ms": 2400 - (13 - day) * 60,
                                "mistakes": round((1 - accuracy) * 10),
                                "hints_used": 1,
                                "rounds": 10,
                                "duration_ms": 240000,
                                "synthetic": True,
                                "completed": True,
                                "abandoned_reason": None,
                                "fatigue_flags": [],
                                "raw_events": [],
                            },
                        },
                    )
                    if not created and session.metrics.get("synthetic") is True:
                        defaults: dict[str, object] = {
                            "completed": True,
                            "abandoned_reason": None,
                            "fatigue_flags": [],
                            "raw_events": [],
                        }
                        missing = {
                            key: value
                            for key, value in defaults.items()
                            if key not in session.metrics
                        }
                        if missing:
                            session.metrics = {**session.metrics, **missing}
                            session.save(update_fields=["metrics", "updated_at"])
        self.stdout.write(
            self.style.SUCCESS(
                "Synthetic cohort ready: 3 users, 5 caregivers, 2 doctors, 1 admin. "
                "Shared password: " + PASSWORD
            )
        )
