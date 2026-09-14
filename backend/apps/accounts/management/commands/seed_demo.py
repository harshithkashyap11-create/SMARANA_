"""Create the stable users and care-team assignments used by local demos."""

from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import PatientCredential, User
from apps.patients.models import CareAssignment, DoctorAssignment, PatientProfile

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

        self.stdout.write(self.style.SUCCESS("Demo users are ready:"))
        self.stdout.write(f"  Patient: {PATIENT_LOGIN_ID} / PIN {PATIENT_PIN}")
        self.stdout.write(f"  Caregiver: priya@example.com / {DEMO_PASSWORD}")
        self.stdout.write(f"  Doctor: deka@example.com / {DEMO_PASSWORD}")
        self.stdout.write(f"  Admin: admin / {DEMO_PASSWORD}")

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
