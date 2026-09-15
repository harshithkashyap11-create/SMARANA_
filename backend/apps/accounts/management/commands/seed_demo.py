"""Create the stable users and care-team assignments used by local demos."""

from datetime import time
from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.models import PatientCredential, User
from apps.patients.models import CareAssignment, DoctorAssignment, PatientProfile
from apps.routines.models import Medication, RoutineItem

PATIENT_LOGIN_ID = "RAO1234"
PATIENT_PIN = "1234"
DEMO_PASSWORD = "SmaranaDemo123!"


class Command(BaseCommand):
    help = "Create or refresh the idempotent local demo users and assignments."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        patient, _ = User.objects.update_or_create(
            username=PATIENT_LOGIN_ID,
            defaults={
                "display_name": "Rao",
                "role": User.Role.PATIENT,
                "email": "",
                "is_approved": True,
            },
        )
        patient.set_unusable_password()
        patient.save(update_fields=["password"])

        caregiver = self._professional_user(
            email="priya@example.com",
            display_name="Priya",
            role=User.Role.CAREGIVER,
        )
        doctor = self._professional_user(
            email="deka@example.com",
            display_name="Dr. Deka",
            role=User.Role.DOCTOR,
        )
        admin, _ = User.objects.update_or_create(
            username="admin",
            defaults={
                "display_name": "Admin",
                "role": User.Role.ADMIN,
                "email": "admin@example.com",
                "is_approved": True,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        admin.set_password(DEMO_PASSWORD)
        admin.save(update_fields=["password"])
        otp_device, _ = TOTPDevice.objects.get_or_create(
            user=admin, name="demo", defaults={"confirmed": True}
        )

        profile, _ = PatientProfile.objects.get_or_create(user=patient)
        credential, _ = PatientCredential.objects.update_or_create(
            user=patient,
            defaults={
                "login_id": PATIENT_LOGIN_ID,
                "failed_attempts": 0,
                "locked_until": None,
            },
        )
        credential.set_pin(PATIENT_PIN)
        credential.save(update_fields=["pin_hash", "updated_at"])
        CareAssignment.objects.update_or_create(
            patient=profile,
            caregiver=caregiver,
            defaults={"active": True, "is_primary": True},
        )
        DoctorAssignment.objects.update_or_create(
            patient=profile,
            doctor=doctor,
            defaults={"active": True},
        )
        Medication.objects.update_or_create(
            patient=profile,
            name="Morning tablet",
            defaults={
                "dose": "1 tablet",
                "times": ["08:00"],
                "instructions": "Take with water after breakfast.",
                "prescribed_by": doctor,
                "active": True,
                "start_date": profile.created_at.date(),
            },
        )
        for title, category, hour in (
            ("Morning tablet", RoutineItem.Category.MEDICINE, 8),
            ("Drink a glass of water", RoutineItem.Category.WATER, 11),
            ("Evening walk", RoutineItem.Category.WALK, 17),
        ):
            RoutineItem.objects.update_or_create(
                patient=profile,
                title=title,
                defaults={
                    "category": category,
                    "time_of_day": time(hour),
                    "days_of_week": list(range(7)),
                    "start_date": profile.created_at.date(),
                    "source": RoutineItem.Source.SYSTEM,
                    "created_by": caregiver,
                },
            )

        self.stdout.write(self.style.SUCCESS("Demo users are ready:"))
        self.stdout.write(f"  Patient: {PATIENT_LOGIN_ID} / PIN {PATIENT_PIN}")
        self.stdout.write(f"  Caregiver: priya@example.com / {DEMO_PASSWORD}")
        self.stdout.write(f"  Doctor: deka@example.com / {DEMO_PASSWORD}")
        self.stdout.write(f"  Admin: admin / {DEMO_PASSWORD}")
        self.stdout.write(f"  Admin TOTP setup: {otp_device.config_url}")

    def _professional_user(self, *, email: str, display_name: str, role: str) -> User:
        user, _ = User.objects.update_or_create(
            username=email,
            defaults={
                "email": email,
                "display_name": display_name,
                "role": role,
                "is_approved": True,
            },
        )
        user.set_password(DEMO_PASSWORD)
        user.save(update_fields=["password"])
        return user
