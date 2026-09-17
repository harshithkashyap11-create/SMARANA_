"""Validated patient comfort settings with offline conflict ordering."""

from datetime import datetime

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import User
from apps.audit.services import audit
from apps.patients.models import PatientProfile


class AccessibilityInput(serializers.Serializer[dict[str, object]]):
    language_locked = serializers.BooleanField(required=False)
    slow_speech = serializers.BooleanField(required=False)
    font_scale = serializers.ChoiceField(choices=[1, 1.2, 1.4, 1.6], required=False)
    theme = serializers.ChoiceField(choices=["light", "dark"], required=False)


@transaction.atomic
def save_accessibility(
    patient: PatientProfile, user: User, settings: dict[str, object], updated_at: datetime | None
) -> None:
    if updated_at is None or timezone.is_naive(updated_at):
        raise serializers.ValidationError("A timezone-aware update timestamp is required.")
    serializer = AccessibilityInput(data=settings)
    serializer.is_valid(raise_exception=True)
    locked = PatientProfile.objects.select_for_update().get(id=patient.id)
    if locked.accessibility_updated_at and updated_at <= locked.accessibility_updated_at:
        return
    locked.accessibility = {**locked.accessibility, **serializer.validated_data}
    locked.accessibility_updated_at = updated_at
    locked.save(update_fields=["accessibility", "accessibility_updated_at", "updated_at"])
    audit(
        user,
        "patient.accessibility_updated",
        locked,
        patient=locked,
        changes={"accessibility": serializer.validated_data},
    )
