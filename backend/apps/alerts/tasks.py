"""Scheduled alert rule evaluation."""

from celery import shared_task
from django.utils import timezone

from apps.alerts.rules import evaluate
from apps.alerts.services import raise_alert
from apps.patients.models import PatientProfile


@shared_task
def evaluate_alert_rules() -> int:
    created_or_updated = 0
    now = timezone.now()
    for patient in PatientProfile.objects.select_related("user").all():
        for draft in evaluate(patient, now):
            raise_alert(
                patient=patient,
                rule_key=draft.rule_key,
                severity=draft.severity,
                title=draft.title,
                explanation=draft.explanation,
                evidence=draft.evidence,
                triggered_at=now,
                update_existing=True,
            )
            created_or_updated += 1
    return created_or_updated


@shared_task
def retry_alert_notifications() -> int:
    """Retry recent urgent alerts; successful recipient/channel pairs are retained."""
    from datetime import timedelta

    from django.db.models import Q

    from apps.alerts.models import Alert
    from apps.alerts.notify import notify_alert

    rows = Alert.objects.filter(
        status=Alert.Status.OPEN, created_at__gte=timezone.now() - timedelta(days=7)
    ).filter(Q(severity=Alert.Severity.HIGH) | Q(rule_key=Alert.RuleKey.SOS))
    count = 0
    for alert in rows.iterator():
        notify_alert(alert)
        count += 1
    return count
