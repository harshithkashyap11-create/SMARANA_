import pytest
from django.core import mail
from django.test import override_settings

from apps.alerts.models import Alert
from apps.alerts.notify import notify_alert
from apps.alerts.services import create_sos
from apps.shared.tests.factories import CareAssignmentFactory, CaregiverFactory, PatientFactory

pytestmark = pytest.mark.django_db


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_sos_sends_one_email_per_assigned_caregiver() -> None:
    patient = PatientFactory.create()
    first = CaregiverFactory.create(email="first@example.test")
    second = CaregiverFactory.create(email="second@example.test")
    CareAssignmentFactory.create(patient=patient, caregiver=first)
    CareAssignmentFactory.create(patient=patient, caregiver=second)

    create_sos(patient=patient, idempotency_key="email-sos")
    alert = Alert.objects.get(patient=patient, rule_key=Alert.RuleKey.SOS)

    assert len(mail.outbox) == 2
    assert {message.to[0] for message in mail.outbox} == {
        "first@example.test",
        "second@example.test",
    }
    assert len([row for row in alert.notified if row["channel"] == "email"]) == 2

    notify_alert(alert)
    assert len(mail.outbox) == 2


def test_mail_failure_preserves_sos_and_can_retry() -> None:
    from unittest.mock import patch

    patient = PatientFactory.create()
    caregiver = CaregiverFactory.create(email="care@example.test")
    CareAssignmentFactory.create(patient=patient, caregiver=caregiver)
    with patch("apps.alerts.notify.send_mail", side_effect=OSError("SMTP unavailable")):
        event, created = create_sos(patient=patient, idempotency_key="smtp-failure")
    assert created
    assert event.pk
    alert = Alert.objects.get(patient=patient, rule_key=Alert.RuleKey.SOS)
    assert not any(row["channel"] == "email" for row in alert.notified)
    with patch("apps.alerts.notify.send_mail", return_value=1) as sender:
        notify_alert(alert)
        notify_alert(alert)
    assert sender.call_count == 1


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_new_sos_notifies_again_while_old_alert_is_open() -> None:
    patient = PatientFactory.create()
    caregiver = CaregiverFactory.create(email="care@example.test")
    CareAssignmentFactory.create(patient=patient, caregiver=caregiver)
    create_sos(patient=patient, idempotency_key="incident-one")
    create_sos(patient=patient, idempotency_key="incident-two")
    create_sos(patient=patient, idempotency_key="incident-two")
    assert len(mail.outbox) == 2
    assert Alert.objects.filter(patient=patient, rule_key=Alert.RuleKey.SOS).count() == 1
