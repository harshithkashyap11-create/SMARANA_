"""Business operations for care-team alerts."""

from collections.abc import Mapping
from datetime import datetime
from typing import Any
from uuid import UUID

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.alerts.models import Alert, SosEvent
from apps.audit.services import audit
from apps.patients.models import PatientProfile


def raise_alert(
    *,
    patient: PatientProfile,
    rule_key: str,
    severity: str,
    title: str,
    explanation: str,
    evidence: Mapping[str, Any] | None = None,
    triggered_at: Any | None = None,
    update_existing: bool = False,
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
            "triggered_at": triggered_at or timezone.now(),
        },
    )
    if not _ and update_existing:
        alert.severity = severity
        alert.title = title
        alert.explanation = explanation
        alert.evidence = dict(evidence or {})
        alert.triggered_at = triggered_at or timezone.now()
        alert.save(
            update_fields=[
                "severity",
                "title",
                "explanation",
                "evidence",
                "triggered_at",
                "updated_at",
            ]
        )
    if _:
        from apps.alerts.notify import notify_alert

        notify_alert(alert)
    return alert


@transaction.atomic
def acknowledge_alert(alert: Alert, actor: User, note: str = "") -> Alert:
    alert.status = Alert.Status.ACKNOWLEDGED
    alert.acknowledged_by = actor
    alert.acknowledged_at = timezone.now()
    alert.notes = note
    alert.save(
        update_fields=["status", "acknowledged_by", "acknowledged_at", "notes", "updated_at"]
    )
    audit(actor, "alert.acknowledged", alert, patient=alert.patient, changes={"note": note})
    return alert


@transaction.atomic
def forward_alert(alert: Alert, actor: User, doctor: User) -> Alert:
    alert.status = Alert.Status.FORWARDED
    alert.forwarded_to = doctor
    alert.save(update_fields=["status", "forwarded_to", "updated_at"])
    audit(
        actor,
        "alert.forwarded",
        alert,
        patient=alert.patient,
        changes={"doctor_id": str(doctor.id)},
    )
    return alert


@transaction.atomic
def dismiss_alert(alert: Alert, actor: User, note: str = "") -> Alert:
    alert.status = Alert.Status.DISMISSED
    alert.notes = note
    alert.save(update_fields=["status", "notes", "updated_at"])
    audit(actor, "alert.dismissed", alert, patient=alert.patient, changes={"note": note})
    return alert


@transaction.atomic
def create_sos(
    *,
    patient: PatientProfile,
    idempotency_key: str,
    location_text: str = "",
    event_id: UUID | None = None,
    triggered_at: datetime | None = None,
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
        **({"id": event_id} if event_id else {}),
        patient=patient,
        idempotency_key=idempotency_key,
        device_updated_at=now,
        triggered_at=triggered_at or now,
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
