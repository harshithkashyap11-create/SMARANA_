"""Personal memories and gentle recognition attempts."""

from django.conf import settings
from django.db import models

from apps.patients.models import FamilyMember, PatientProfile
from apps.shared.models import OfflineCapable, SoftDelete, TimeStamped, UUIDModel


class Memory(UUIDModel, TimeStamped, SoftDelete):
    class Occasion(models.TextChoices):
        BIRTHDAY = "birthday", "Birthday"
        FESTIVAL = "festival", "Festival"
        WEDDING = "wedding", "Wedding"
        TRIP = "trip", "Trip"
        DAILY = "daily", "Everyday moment"
        OTHER = "other", "Other"

    class Visibility(models.TextChoices):
        PRIVATE = "private", "Private"
        QUIZ = "quiz", "Quiz"
        CARE_TEAM = "care_team", "Care team"

    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="memories")
    title = models.CharField(max_length=255)
    occasion = models.CharField(max_length=16, choices=Occasion.choices)
    occurred_on = models.DateField(blank=True, null=True)
    place = models.CharField(max_length=255, blank=True)
    summary = models.TextField()
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    visibility = models.CharField(max_length=16, choices=Visibility.choices)
    people = models.ManyToManyField(FamilyMember, blank=True, related_name="memories")

    class Meta:
        ordering = ["-occurred_on", "-created_at"]


class MemoryMedia(UUIDModel, TimeStamped):
    class Kind(models.TextChoices):
        PHOTO = "photo", "Photo"
        VIDEO = "video", "Video"
        AUDIO = "audio", "Audio"

    memory = models.ForeignKey(Memory, on_delete=models.CASCADE, related_name="media")
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.PHOTO)
    file = models.FileField(upload_to="memories/%Y/%m/")
    caption = models.CharField(max_length=255, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]


class MemoryQuizAttempt(OfflineCapable):
    class QuestionType(models.TextChoices):
        WHO = "who", "Who"
        WHEN = "when", "When"
        WHERE = "where", "Where"
        OCCASION = "occasion", "Occasion"

    patient = models.ForeignKey(
        PatientProfile, on_delete=models.CASCADE, related_name="quiz_attempts"
    )
    memory = models.ForeignKey(Memory, on_delete=models.SET_NULL, blank=True, null=True)
    question_type = models.CharField(max_length=16, choices=QuestionType.choices)
    expected = models.CharField(max_length=255)
    given = models.CharField(max_length=255)
    correct = models.BooleanField()
    attempted_at = models.DateTimeField()
    response_ms = models.PositiveIntegerField()

    class Meta:
        ordering = ["-attempted_at", "id"]
