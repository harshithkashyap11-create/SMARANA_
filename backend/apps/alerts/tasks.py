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
