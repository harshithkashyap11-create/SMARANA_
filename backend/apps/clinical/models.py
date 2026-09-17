from django.conf import settings
from django.db import models

from apps.patients.models import PatientProfile
from apps.shared.models import TimeStamped, UUIDModel


class ClinicalNote(UUIDModel, TimeStamped):
    class Category(models.TextChoices):
        COGNITIVE = "cognitive", "Cognitive"
        MEDICATION = "medication", "Medication"
        MOOD = "mood", "Mood"
        SLEEP = "sleep", "Sleep"
        ROUTINE = "routine", "Routine"
        GENERAL = "general", "General"
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
    status_summary = models.CharField(max_length=255, blank=True)
    text = models.TextField()
    follow_up_date = models.DateField(blank=True, null=True)
    reply_to = models.ForeignKey(
        "self", on_delete=models.SET_NULL, related_name="replies", blank=True, null=True
    )

    class Meta:
        ordering = ["-created_at", "id"]


class ClinicalBaseline(UUIDModel, TimeStamped):
    patient = models.OneToOneField(
        PatientProfile, on_delete=models.CASCADE, related_name="clinical_baseline"
    )
    allergies = models.TextField(blank=True)
    diagnoses = models.TextField(blank=True)
    assessment_scores = models.JSONField(default=list, blank=True)
    visual_limits = models.TextField(blank=True)
    motor_limits = models.TextField(blank=True)
    ideal_session_minutes = models.PositiveSmallIntegerField(blank=True, null=True)
    max_difficulty_level = models.PositiveSmallIntegerField(blank=True, null=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)


class DdaOverride(UUIDModel, TimeStamped):
    class Action(models.TextChoices):
        SET_LEVEL = "set_level", "Set level"
        LOCK = "lock", "Lock"
        UNLOCK = "unlock", "Unlock"
        CAP = "cap", "Cap"

    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE)
    game = models.ForeignKey("games.GameDefinition", on_delete=models.CASCADE)
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    action = models.CharField(max_length=16, choices=Action.choices)
    value = models.PositiveSmallIntegerField(blank=True, null=True)
    reason = models.TextField()


class ExerciseAssignment(UUIDModel, TimeStamped):
    class TimeSlot(models.TextChoices):
        MORNING = "morning", "Morning"
        AFTERNOON = "afternoon", "Afternoon"
        EVENING = "evening", "Evening"

    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="exercise_assignments"
    )
    doctor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    game = models.ForeignKey("games.GameDefinition", on_delete=models.PROTECT)
    start_level = models.PositiveSmallIntegerField()
    target_minutes = models.PositiveSmallIntegerField()
    times_per_week = models.PositiveSmallIntegerField()
    time_slot = models.CharField(max_length=16, choices=TimeSlot.choices)
    review_date = models.DateField()
    active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["review_date", "id"]
