"""Business operations for care-team alerts."""

from collections.abc import Mapping
from typing import Any

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.alerts.models import Alert, SosEvent
from apps.patients.models import PatientProfile


def raise_alert(
    *,
    patient: PatientProfile,
    rule_key: str,
    severity: str,
    title: str,
    explanation: str,
    evidence: Mapping[str, Any] | None = None,
) -> Alert:
    """Create an open alert unless the same patient/rule already has one."""

    alert, _ = Alert.objects.get_or_create(
        patient=patient,
        rule_key=rule_key,
        status=Alert.Status.OPEN,
        defaults={
            "severity": severity,
            "title": title,
            "explanation": explanation,
            "evidence": dict(evidence or {}),
            "triggered_at": timezone.now(),
        },
    )
    return alert


@transaction.atomic
def create_sos(
    *, patient: PatientProfile, idempotency_key: str, location_text: str = ""
) -> tuple[SosEvent, bool]:
    """Create one event and one patient alert carrying all in-app recipients."""

    existing = SosEvent.objects.filter(idempotency_key=idempotency_key).first()
    if existing:
        if existing.patient_id != patient.id:
            raise ValidationError("That request key is already in use.")
        return existing, False
    now = timezone.now()
    recipients = [
        str(value)
        for value in patient.care_assignments.filter(active=True).values_list(
            "caregiver_id", flat=True
        )
    ]
    event = SosEvent.objects.create(
        patient=patient,
        idempotency_key=idempotency_key,
        device_updated_at=now,
        triggered_at=now,
        location_text=location_text,
        notified=[
            {"user_id": user_id, "channel": "in_app", "at": now.isoformat()}
            for user_id in recipients
        ],
    )
    alert = raise_alert(
        patient=patient,
        rule_key=Alert.RuleKey.SOS,
        severity=Alert.Severity.HIGH,
        title="Emergency help requested",
        explanation=f"The patient requested emergency help at {now.isoformat()}.",
        evidence={"sos_event_id": str(event.id), "recipient_ids": recipients},
    )
    event.notified.append({"alert_id": str(alert.id)})
    event.save(update_fields=["notified", "updated_at"])
    return event, True
