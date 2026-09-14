"""Tests for alert creation and open-alert deduplication."""

import pytest
from django.db import IntegrityError

from apps.alerts.models import Alert
from apps.alerts.services import raise_alert
from apps.shared.tests.factories import PatientFactory


@pytest.mark.django_db
def test_raise_alert_creates_open_alert_with_evidence() -> None:
    patient = PatientFactory()

    alert = raise_alert(
        patient=patient,
        rule_key=Alert.RuleKey.PIN_LOCKOUT,
        severity=Alert.Severity.ATTENTION,
        title="Patient PIN locked",
        explanation="Five PIN attempts were not verified.",
        evidence={"failed_attempts": 5},
    )

    assert alert.status == Alert.Status.OPEN
    assert alert.patient == patient
    assert alert.evidence == {"failed_attempts": 5}


@pytest.mark.django_db
def test_raise_alert_reuses_existing_open_alert_for_patient_and_rule() -> None:
    patient = PatientFactory()
    first = raise_alert(
        patient=patient,
        rule_key=Alert.RuleKey.PIN_LOCKOUT,
        severity=Alert.Severity.ATTENTION,
        title="Patient PIN locked",
        explanation="Initial lockout.",
    )

    duplicate = raise_alert(
        patient=patient,
        rule_key=Alert.RuleKey.PIN_LOCKOUT,
        severity=Alert.Severity.HIGH,
        title="Duplicate lockout",
        explanation="This should reuse the open alert.",
    )

    assert duplicate.pk == first.pk
    assert Alert.objects.filter(
        patient=patient,
        rule_key=Alert.RuleKey.PIN_LOCKOUT,
        status=Alert.Status.OPEN,
    ).count() == 1
    duplicate.refresh_from_db()
    assert duplicate.explanation == "Initial lockout."


@pytest.mark.django_db
def test_raise_alert_creates_new_alert_after_previous_one_is_closed() -> None:
    patient = PatientFactory()
    first = raise_alert(
        patient=patient,
        rule_key=Alert.RuleKey.PIN_LOCKOUT,
        severity=Alert.Severity.ATTENTION,
        title="Patient PIN locked",
        explanation="Initial lockout.",
    )
    first.status = Alert.Status.DISMISSED
    first.save(update_fields=["status", "updated_at"])

    reopened = raise_alert(
        patient=patient,
        rule_key=Alert.RuleKey.PIN_LOCKOUT,
        severity=Alert.Severity.ATTENTION,
        title="Patient PIN locked again",
        explanation="A later lockout.",
    )

    assert reopened.pk != first.pk
    assert Alert.objects.filter(patient=patient).count() == 2


@pytest.mark.django_db
def test_database_prevents_duplicate_open_alerts() -> None:
    patient = PatientFactory()
    values = {
        "patient": patient,
        "rule_key": Alert.RuleKey.PIN_LOCKOUT,
        "severity": Alert.Severity.ATTENTION,
        "title": "Patient PIN locked",
        "explanation": "Five PIN attempts were not verified.",
    }
    Alert.objects.create(**values)

    with pytest.raises(IntegrityError):
        Alert.objects.create(**values)
