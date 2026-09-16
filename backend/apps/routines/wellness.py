"""Audited wellness entry and correction."""

from uuid import uuid4

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import audit
from apps.patients.models import PatientProfile
from apps.routines.models import MoodLog, SleepLog
from apps.routines.serializers import MoodLogSerializer, SleepLogSerializer


@transaction.atomic
def save_log(
    serializer: MoodLogSerializer | SleepLogSerializer, patient: PatientProfile, actor: User
) -> MoodLog | SleepLog:
    before = dict(serializer.__class__(serializer.instance).data) if serializer.instance else None
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
        changes={"before": before, "after": dict(serializer.__class__(obj).data)},
    )
    return obj
