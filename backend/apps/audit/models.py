"""Immutable records of meaningful account and patient-data activity."""

from collections.abc import Iterable
from typing import NoReturn

from django.conf import settings
from django.db import models
from django.db.models.base import ModelBase

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
        indexes = [
            models.Index(
                fields=["patient", "created_at"],
                name="audit_audit_patien_4a3b60_idx",
            )
        ]

    def __str__(self) -> str:
        return f"{self.action} {self.target_model} at {self.created_at:%Y-%m-%d %H:%M}"

    def save(
        self,
        force_insert: bool | tuple[ModelBase, ...] = False,
        force_update: bool = False,
        using: str | None = None,
        update_fields: Iterable[str] | None = None,
    ) -> None:
        if not self._state.adding:
            raise RuntimeError("Audit events are append-only.")
        super().save(
            force_insert=force_insert,
            force_update=force_update,
            using=using,
            update_fields=update_fields,
        )

    def delete(self, using: str | None = None, keep_parents: bool = False) -> NoReturn:
        raise RuntimeError("Audit events cannot be deleted.")
