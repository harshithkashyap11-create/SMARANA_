"""Immutable records of meaningful account and patient-data activity."""

from django.conf import settings
from django.db import models

from apps.shared.models import UUIDModel


class AuditEvent(UUIDModel):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="audit_events",
    )
    actor_role = models.CharField(max_length=16, blank=True)
    action = models.CharField(max_length=64)
    target_model = models.CharField(max_length=128)
    target_id = models.UUIDField(blank=True, null=True)
    patient = models.ForeignKey(
        "patients.PatientProfile",
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="audit_events",
    )
    changes = models.JSONField(default=dict, blank=True)
    ip = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["patient", "created_at"])]

    def __str__(self) -> str:
        return f"{self.action} {self.target_model} at {self.created_at:%Y-%m-%d %H:%M}"

    def save(self, *args, **kwargs) -> None:
        if not self._state.adding:
            raise RuntimeError("Audit events are append-only.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs) -> None:
        raise RuntimeError("Audit events cannot be deleted.")
