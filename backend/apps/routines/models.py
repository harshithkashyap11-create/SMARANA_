"""Routine and medicine persistence models."""

from django.conf import settings
from django.db import models

from apps.patients.models import PatientProfile
from apps.shared.models import SoftDelete, TimeStamped, UUIDModel


class RoutineItem(UUIDModel, TimeStamped, SoftDelete):
    class Category(models.TextChoices):
        MEDICINE = "medicine", "Medicine"
        WATER = "water", "Water"
        MEAL = "meal", "Meal"
        DOCTOR_VISIT = "doctor_visit", "Doctor visit"
        GAME = "game", "Game"
        WALK = "walk", "Walk"
        CALL = "call", "Call"
        SLEEP = "sleep", "Sleep"
        CUSTOM = "custom", "Custom"

    class Source(models.TextChoices):
        CAREGIVER = "caregiver", "Caregiver"
        DOCTOR = "doctor", "Doctor"
        SYSTEM = "system", "System"
        PATIENT = "patient", "Patient"

    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="routine_items"
    )
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=32, choices=Category.choices)
    time_of_day = models.TimeField()
    days_of_week = models.JSONField(default=list)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    icon = models.CharField(max_length=64, blank=True)
    note = models.TextField(blank=True)
    source = models.CharField(max_length=16, choices=Source.choices)
    source_ref = models.UUIDField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ["time_of_day", "id"]


class Reminder(UUIDModel, TimeStamped):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        TAKEN = "taken", "Taken"
        LATER = "later", "Later"
        SKIPPED = "skipped", "Skipped"
        HELP = "help", "Help"
        MISSED = "missed", "Missed"

    routine_item = models.ForeignKey(
        RoutineItem, on_delete=models.CASCADE, related_name="reminders"
    )
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="routine_reminders"
    )
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING)
    snoozed_until = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ["scheduled_at", "id"]


class ReminderResponse(UUIDModel, TimeStamped):
    class Action(models.TextChoices):
        TAKEN = "taken", "Taken"
        LATER = "later", "Later"
        SKIPPED = "skipped", "Skipped"
        HELP = "help", "Help"

    reminder = models.ForeignKey(Reminder, on_delete=models.CASCADE, related_name="responses")
    action = models.CharField(max_length=16, choices=Action.choices)
    responded_at = models.DateTimeField()
    note = models.TextField(blank=True)
    idempotency_key = models.UUIDField(unique=True)

    class Meta:
        ordering = ["responded_at", "id"]


class Medication(UUIDModel, TimeStamped):
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="medications"
    )
    name = models.CharField(max_length=255)
    dose = models.CharField(max_length=128)
    times = models.JSONField(default=list)
    instructions = models.TextField(blank=True)
    prescribed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    active = models.BooleanField(default=True)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    flag_for_caregiver = models.BooleanField(default=False)

    class Meta:
        ordering = ["name", "id"]
