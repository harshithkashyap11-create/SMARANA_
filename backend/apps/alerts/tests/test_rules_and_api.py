from datetime import timedelta

import pytest
from django.utils import timezone
from freezegun import freeze_time
from rest_framework.test import APIClient

from apps.accounts.models import DeviceSession
from apps.alerts.models import Alert
from apps.alerts.rules import level_drop_x3, missed_meds_3in7, no_login_2d
from apps.alerts.services import raise_alert
from apps.audit.models import AuditEvent
from apps.games.models import DifficultyChange, DifficultyState, GameDefinition
from apps.routines.models import Reminder
from apps.shared.tests.factories import (
    CareAssignmentFactory,
    CaregiverFactory,
    DoctorAssignmentFactory,
    DoctorFactory,
    PatientFactory,
    ReminderFactory,
)

pytestmark = pytest.mark.django_db


def client_for(user: object) -> APIClient:
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@freeze_time("2026-09-15 02:00:00+05:30")
def test_no_login_boundary_requires_more_than_48_hours() -> None:
    patient = PatientFactory()
    now = timezone.now()
    session = DeviceSession.objects.create(
        user=patient.user,
        device_id="phone",
        refresh_token_jti="jti",
        last_seen_at=now - timedelta(hours=48),
    )
    assert no_login_2d(patient, now) is None
    session.last_seen_at = now - timedelta(hours=48, seconds=1)
    session.save(update_fields=["last_seen_at"])
    draft = no_login_2d(patient, now)
    assert draft is not None
    assert draft.rule_key == Alert.RuleKey.NO_LOGIN_2D


@freeze_time("2026-09-15 02:00:00+05:30")
def test_three_missed_medicines_trigger_with_explanation() -> None:
    patient = PatientFactory()
    now = timezone.now()
    for days in (1, 2, 3):
        reminder = ReminderFactory(
            patient=patient,
            routine_item__patient=patient,
            routine_item__category="medicine",
            scheduled_at=now - timedelta(days=days),
        )
        reminder.status = Reminder.Status.MISSED
        reminder.save(update_fields=["status"])
    draft = missed_meds_3in7(patient, now)
    assert draft is not None
    assert "Missed 3 of 3" in draft.explanation


@freeze_time("2026-09-15 02:00:00+05:30")
def test_level_drop_requires_three_demotions_and_dedupe_updates_evidence() -> None:
    patient = PatientFactory()
    game = GameDefinition.objects.create(key="sequence", name="Sequence", min_level=1, max_level=10)
    state = DifficultyState.objects.create(patient=patient, game=game, level=2)
    DifficultyChange.objects.create(
        state=state, from_level=3, to_level=2, reason_code="demote", explanation="pattern"
    )
    assert level_drop_x3(patient, timezone.now()) is None
    for level in (4, 5):
        DifficultyChange.objects.create(
            state=state,
            from_level=level,
            to_level=level - 1,
            reason_code="demote",
            explanation="pattern",
        )
    draft = level_drop_x3(patient, timezone.now())
    assert draft is not None
    first = raise_alert(
        patient=patient,
        rule_key=draft.rule_key,
        severity=draft.severity,
        title=draft.title,
        explanation=draft.explanation,
        evidence={"count": 3},
    )
    second = raise_alert(
        patient=patient,
        rule_key=draft.rule_key,
        severity=draft.severity,
        title=draft.title,
        explanation=draft.explanation,
        evidence={"count": 4},
        update_existing=True,
    )
    assert first.id == second.id
    assert (
        Alert.objects.filter(patient=patient, status="open", rule_key=draft.rule_key).count() == 1
    )
    assert second.evidence["count"] == 4


def test_alert_actions_are_scoped_forwarded_and_audited() -> None:
    patient = PatientFactory()
    other = PatientFactory()
    caregiver = CaregiverFactory()
    doctor = DoctorFactory()
    CareAssignmentFactory(patient=patient, caregiver=caregiver)
    DoctorAssignmentFactory(patient=patient, doctor=doctor)
    alert = raise_alert(
        patient=patient,
        rule_key="no_login_2d",
        severity="attention",
        title="No login",
        explanation="Last login was over two days ago.",
    )
    other_alert = raise_alert(
        patient=other,
        rule_key="no_login_2d",
        severity="attention",
        title="No login",
        explanation="Private",
    )
    client = client_for(caregiver)
    response = client.get(f"/api/v1/alerts/?patient={patient.id}&status=open")
    assert [row["id"] for row in response.data] == [str(alert.id)]
    assert client.post(f"/api/v1/alerts/{other_alert.id}/acknowledge/").status_code == 404
    acknowledged = client.post(
        f"/api/v1/alerts/{alert.id}/acknowledge/", {"note": "Called the patient"}
    )
    assert acknowledged.status_code == 200
    assert acknowledged.data["status"] == "acknowledged"
    assert AuditEvent.objects.filter(action="alert.acknowledged", target_id=alert.id).exists()
    forwarded = client.post(f"/api/v1/alerts/{alert.id}/forward/")
    assert forwarded.status_code == 200
    assert str(forwarded.data["forwarded_to"]) == str(doctor.id)
    assert AuditEvent.objects.filter(action="alert.forwarded", target_id=alert.id).exists()
    dismissed = client_for(doctor).post(f"/api/v1/alerts/{alert.id}/dismiss/", {"note": "Reviewed"})
    assert dismissed.status_code == 200
    assert dismissed.data["status"] == "dismissed"
