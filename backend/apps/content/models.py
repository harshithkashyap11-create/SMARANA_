"""Models for reviewed regional content packs."""

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from apps.shared.models import TimeStamped, UUIDModel


class Region(UUIDModel, TimeStamped):
    code = models.CharField(max_length=4, unique=True)
    name = models.CharField(max_length=100)
    enabled = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class Language(UUIDModel, TimeStamped):
    code = models.CharField(max_length=12, unique=True)
    name = models.CharField(max_length=100)
    native_name = models.CharField(max_length=100)
    enabled = models.BooleanField(default=True)
    tts_locale = models.CharField(max_length=20, blank=True)
    font_family = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name


class ContentItem(UUIDModel, TimeStamped):
    class Kind(models.TextChoices):
        PLACE = "place", "Place"
        FESTIVAL = "festival", "Festival"
        DISH = "dish", "Dish"
        TUNE = "tune", "Tune"
        ACTIVITY = "activity", "Activity"
        SOUND = "sound", "Sound"
        WORD = "word", "Word"
        ROUTINE_SCENE = "routine_scene", "Routine scene"

    class ReviewStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        REVIEWED = "reviewed", "Reviewed"
        PUBLISHED = "published", "Published"

    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="content_items")
    kind = models.CharField(max_length=24, choices=Kind.choices)
    title = models.CharField(max_length=255)
    title_translations = models.JSONField(default=dict, blank=True)
    image = models.ImageField(upload_to="content/images/%Y/%m/", blank=True)
    audio = models.FileField(upload_to="content/audio/%Y/%m/", blank=True)
    tags = models.JSONField(default=dict, blank=True)
    review_status = models.CharField(
        max_length=16, choices=ReviewStatus.choices, default=ReviewStatus.DRAFT
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_content_items",
    )

    class Meta:
        ordering = ["region__name", "kind", "title"]
        constraints = [
            models.UniqueConstraint(fields=["region", "kind", "title"], name="unique_content_title")
        ]

    def __str__(self) -> str:
        return f"{self.region.code}: {self.title}"

    def clean(self) -> None:
        super().clean()
        if self.review_status == self.ReviewStatus.PUBLISHED and not self.reviewed_by_id:
            raise ValidationError({"review_status": "Published content must have a reviewer."})
