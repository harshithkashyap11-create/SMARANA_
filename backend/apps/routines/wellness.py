"""Audited wellness entry and correction."""

from typing import Any
from uuid import uuid4

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import audit
from apps.patients.models import PatientProfile
from apps.routines.models import MoodLog, SleepLog
from apps.routines.serializers import MoodLogSerializer, SleepLogSerializer


def log_snapshot(instance: MoodLog | SleepLog) -> dict[str, Any]:
    if isinstance(instance, MoodLog):
        return dict(MoodLogSerializer(instance).data)
    return dict(SleepLogSerializer(instance).data)


@transaction.atomic
def save_log(
    serializer: MoodLogSerializer | SleepLogSerializer, patient: PatientProfile, actor: User
) -> MoodLog | SleepLog:
    before = log_snapshot(serializer.instance) if serializer.instance else None
    obj = serializer.save(
        patient=patient,
        source=serializer.instance.source if serializer.instance else actor.role,
        device_updated_at=serializer.validated_data.get("device_updated_at", timezone.now()),
        **(
            {}
            if serializer.instance
            else {"idempotency_key": str(serializer.validated_data.get("id", uuid4()))}
        ),
    )
    audit(
        actor,
        "wellness.corrected" if before else "wellness.created",
        obj,
        patient=patient,
        changes={"before": before, "after": log_snapshot(obj)},
    )
    return obj
