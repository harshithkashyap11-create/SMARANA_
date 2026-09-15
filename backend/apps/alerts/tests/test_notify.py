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
    patient = PatientFactory()
    first = CaregiverFactory(email="first@example.test")
    second = CaregiverFactory(email="second@example.test")
    CareAssignmentFactory(patient=patient, caregiver=first)
    CareAssignmentFactory(patient=patient, caregiver=second)

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
