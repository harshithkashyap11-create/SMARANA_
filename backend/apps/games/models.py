"""Cognitive game catalogue, sessions, and adaptive difficulty state."""

from django.db import models

from apps.patients.models import PatientProfile
from apps.shared.models import TimeStamped, UUIDModel


class GameDefinition(UUIDModel, TimeStamped):
    key = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    cognitive_domains = models.JSONField(default=list)
    min_level = models.PositiveSmallIntegerField(default=1)
    max_level = models.PositiveSmallIntegerField(default=10)
    is_regional = models.BooleanField(default=False)
    metrics_schema = models.JSONField(default=dict)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class GameSession(UUIDModel, TimeStamped):
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="game_sessions"
    )
    game = models.ForeignKey(GameDefinition, on_delete=models.PROTECT, related_name="sessions")
    seed = models.CharField(max_length=64)
    level = models.PositiveSmallIntegerField()
    metrics = models.JSONField(default=dict)
    challenge_mode = models.BooleanField(default=False)
    guest_mode = models.BooleanField(default=False)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField()

    class Meta:
        ordering = ["-ended_at", "id"]


class DifficultyState(UUIDModel, TimeStamped):
    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="difficulty_states"
    )
    game = models.ForeignKey(
        GameDefinition, on_delete=models.CASCADE, related_name="difficulty_states"
    )
    level = models.PositiveSmallIntegerField()
    window = models.JSONField(default=list)
    locked_by_doctor = models.BooleanField(default=False)
    locked_by_name = models.CharField(max_length=128, blank=True)
    cap_level = models.PositiveSmallIntegerField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "game"], name="unique_patient_game_difficulty"
            )
        ]


class DifficultyChange(UUIDModel, TimeStamped):
    state = models.ForeignKey(DifficultyState, on_delete=models.CASCADE, related_name="changes")
    session = models.ForeignKey(
        GameSession,
        on_delete=models.SET_NULL,
        related_name="difficulty_changes",
        null=True,
        blank=True,
    )
    from_level = models.PositiveSmallIntegerField()
    to_level = models.PositiveSmallIntegerField()
    reason_code = models.CharField(max_length=32)
    explanation = models.TextField()

    class Meta:
        ordering = ["-created_at", "id"]
