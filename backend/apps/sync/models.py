from django.conf import settings
from django.db import models

from apps.shared.models import TimeStamped, UUIDModel


class IdempotencyRecord(UUIDModel, TimeStamped):
    key = models.CharField(max_length=255, unique=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    model = models.CharField(max_length=64)
    object_id = models.UUIDField()


class SyncRejection(UUIDModel, TimeStamped):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    patient_id = models.UUIDField()
    model = models.CharField(max_length=64)
    code = models.CharField(max_length=32)
    detail = models.TextField(blank=True)
