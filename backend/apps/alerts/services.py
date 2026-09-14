"""Business operations for care-team alerts."""

from collections.abc import Mapping
from typing import Any

from django.utils import timezone

from apps.alerts.models import Alert
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
