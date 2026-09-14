"""Patient profiles and care-team assignment models."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import User
from apps.shared.models import SoftDelete, TimeStamped, UUIDModel


class PatientProfile(UUIDModel, TimeStamped):
    """The patient-domain identity attached to a patient user."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="patient_profile",
    )
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=32, blank=True)
    # Region records are introduced by T090; keep the stable region key until then.
    region = models.CharField(max_length=64, blank=True)
    cultural_notes = models.TextField(blank=True)
    home_label = models.CharField(max_length=255, blank=True)
    known_places = models.JSONField(default=list, blank=True)
    life_events = models.JSONField(default=list, blank=True)
    work_history = models.TextField(blank=True)
    favourite_songs = models.JSONField(default=list, blank=True)
    hobbies = models.JSONField(default=list, blank=True)
    happy_things = models.JSONField(default=list, blank=True)
    soothing_prompts = models.JSONField(default=list, blank=True)
    accessibility = models.JSONField(default=dict, blank=True)
    session_cap_minutes = models.PositiveSmallIntegerField(blank=True, null=True)
    max_difficulty_level = models.PositiveSmallIntegerField(blank=True, null=True)
    challenge_mode_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["user__username"]

    def __str__(self) -> str:
        return str(self.user)

    def clean(self) -> None:
        super().clean()
        if self.user_id and self.user.role != User.Role.PATIENT:
            raise ValidationError({"user": "Patient profiles require a patient user."})


class FamilyMember(UUIDModel, TimeStamped, SoftDelete):
    """A familiar person shown on the patient's device."""

    class Relationship(models.TextChoices):
        DAUGHTER = "daughter", "Daughter"
        SON = "son", "Son"
        SPOUSE = "spouse", "Spouse"
        GRANDCHILD = "grandchild", "Grandchild"
        FRIEND = "friend", "Friend"
        SIBLING = "sibling", "Sibling"
        OTHER = "other", "Other"

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="family_members",
    )
    name = models.CharField(max_length=255)
    relationship = models.CharField(max_length=32, choices=Relationship.choices)
    relationship_label = models.CharField(max_length=128, blank=True)
    photo = models.ImageField(upload_to="family/%Y/%m/", blank=True)
    phone = models.CharField(max_length=32, blank=True)
    is_emergency_contact = models.BooleanField(default=False)
    linked_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="family_links",
        blank=True,
        null=True,
    )
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "name", "id"]

    def __str__(self) -> str:
        return f"{self.name} ({self.relationship})"


class ConsentSettings(UUIDModel, TimeStamped):
    """Patient-controlled sharing choices."""

    patient = models.OneToOneField(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="consent",
    )
    share_memories_with_doctor = models.BooleanField(default=False)
    use_memories_in_quiz = models.BooleanField(default=False)
    share_mood_with_doctor = models.BooleanField(default=False)
    share_audio_with_doctor = models.BooleanField(default=False)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="consent_updates",
        blank=True,
        null=True,
    )

    class Meta:
        ordering = ["patient__user__username"]

    def __str__(self) -> str:
        return f"Consent for {self.patient}"


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
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="care_assignments_created",
        blank=True,
        null=True,
    )
    assigned_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(blank=True, null=True)
    reason = models.TextField(blank=True)

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
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="doctor_assignments_created",
        blank=True,
        null=True,
    )
    assigned_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(blank=True, null=True)
    reason = models.TextField(blank=True)

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
