from django.conf import settings
from django.db import models

from apps.patients.models import PatientProfile
from apps.shared.models import TimeStamped, UUIDModel


class ClinicalNote(UUIDModel, TimeStamped):
    class Category(models.TextChoices):
        CAREGIVER_FEEDBACK = "caregiver_feedback", "Caregiver feedback"
        OBSERVATION = "observation", "Observation"
        FOLLOW_UP = "follow_up", "Follow-up"

    class Visibility(models.TextChoices):
        CARE_TEAM = "care_team", "Care team"
        PATIENT_VISIBLE = "patient_visible", "Patient visible"
        DOCTOR_ONLY = "doctor_only", "Doctor only"

    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="clinical_notes"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="clinical_notes"
    )
    category = models.CharField(max_length=32, choices=Category.choices)
    visibility = models.CharField(
        max_length=32, choices=Visibility.choices, default=Visibility.CARE_TEAM
    )
    text = models.TextField()

    class Meta:
        ordering = ["-created_at", "id"]
