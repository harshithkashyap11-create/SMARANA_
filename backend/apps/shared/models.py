"""Abstract model mixins shared across bounded contexts."""

from typing import Any
from uuid import uuid4

from django.db import models
from django.utils import timezone


class UUIDModel(models.Model):
    """Give a model an offline-friendly UUID primary key."""

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)

    class Meta:
        abstract = True


class TimeStamped(models.Model):
    """Record creation and last-update timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet[Any]):
    """Soft-delete every selected record."""

    def delete(self) -> tuple[int, dict[str, int]]:
        count = self.update(deleted_at=timezone.now())
        return count, {self.model._meta.label: count}


class SoftDeleteManager(models.Manager[Any]):
    """Return only active records by default."""

    def get_queryset(self) -> SoftDeleteQuerySet:
        return SoftDeleteQuerySet(self.model, using=self._db).filter(deleted_at__isnull=True)


class SoftDelete(models.Model):
    """Preserve records while hiding deleted rows from normal queries."""

    deleted_at = models.DateTimeField(blank=True, null=True)

    all_objects = models.Manager()
    objects = SoftDeleteManager()

    class Meta:
        abstract = True

    def delete(
        self,
        using: str | None = None,
        keep_parents: bool = False,
    ) -> tuple[int, dict[str, int]]:
        del keep_parents
        self.deleted_at = timezone.now()
        self.save(using=using, update_fields=["deleted_at"])
        return 1, {self._meta.label: 1}

    def restore(self, using: str | None = None) -> None:
        self.deleted_at = None
        self.save(using=using, update_fields=["deleted_at"])

class OfflineCapable(UUIDModel, TimeStamped):
    """Fields required for records created on a disconnected device."""

    device_updated_at = models.DateTimeField()
    idempotency_key = models.CharField(max_length=128, unique=True)

    class Meta:
        abstract = True
