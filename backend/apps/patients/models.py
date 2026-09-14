"""Patient profiles and care-team assignment models."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import User
from apps.shared.models import TimeStamped, UUIDModel


class PatientProfile(UUIDModel, TimeStamped):
    """The patient-domain identity attached to a patient user."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="patient_profile",
    )

    class Meta:
        ordering = ["user__username"]

    def __str__(self) -> str:
        return str(self.user)

    def clean(self) -> None:
        super().clean()
        if self.user_id and self.user.role != User.Role.PATIENT:
            raise ValidationError({"user": "Patient profiles require a patient user."})


class CareAssignment(UUIDModel, TimeStamped):
    """An active or historical caregiver-to-patient assignment."""

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="care_assignments",
    )
    caregiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="care_assignments",
    )
    is_primary = models.BooleanField(default=False)
    active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-assigned_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "caregiver"],
                condition=Q(active=True),
                name="unique_active_care_assignment",
            ),
            models.UniqueConstraint(
                fields=["patient"],
                condition=Q(active=True, is_primary=True),
                name="unique_active_primary_caregiver",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.caregiver} → {self.patient}"

    def clean(self) -> None:
        super().clean()
        if self.caregiver_id and self.caregiver.role != User.Role.CAREGIVER:
            raise ValidationError({"caregiver": "Care assignments require a caregiver user."})
        if self.is_primary and not self.active:
            raise ValidationError({"is_primary": "An inactive assignment cannot be primary."})


class DoctorAssignment(UUIDModel, TimeStamped):
    """An active or historical doctor-to-patient assignment."""

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="doctor_assignments",
    )
    doctor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="doctor_assignments",
    )
    active = models.BooleanField(default=True)
    assigned_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-assigned_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "doctor"],
                condition=Q(active=True),
                name="unique_active_doctor_assignment",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.doctor} → {self.patient}"

    def clean(self) -> None:
        super().clean()
        if self.doctor_id and self.doctor.role != User.Role.DOCTOR:
            raise ValidationError({"doctor": "Doctor assignments require a doctor user."})
