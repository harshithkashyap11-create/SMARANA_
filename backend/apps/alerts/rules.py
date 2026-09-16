"""Purely described alert rules backed by assignment-scoped patient history."""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from apps.accounts.models import DeviceSession
from apps.alerts.models import Alert
from apps.games.models import DifficultyChange
from apps.patients.models import PatientProfile
from apps.routines.models import Reminder, RoutineItem


@dataclass(frozen=True)
class AlertDraft:
    rule_key: str
    severity: str
    title: str
    explanation: str
    evidence: dict[str, Any]


def no_login_2d(patient: PatientProfile, now: datetime) -> AlertDraft | None:
    session = DeviceSession.objects.filter(user=patient.user).order_by("-last_seen_at").first()
    if session is None or session.last_seen_at >= now - timedelta(hours=48):
        return None
    hours = int((now - session.last_seen_at).total_seconds() // 3600)
    return AlertDraft(
        Alert.RuleKey.NO_LOGIN_2D,
        Alert.Severity.ATTENTION,
        "No recent patient login",
        (
            f"The patient was last active {hours} hours ago, "
            f"at {session.last_seen_at:%-d %b, %-I:%M %p}."
        ),
        {
            "device_session_id": str(session.id),
            "last_seen_at": session.last_seen_at.isoformat(),
            "hours": hours,
        },
    )


def device_offline_3d(patient: PatientProfile, now: datetime) -> AlertDraft | None:
    session = DeviceSession.objects.filter(user=patient.user).order_by("-last_seen_at").first()
    if session is None or session.last_seen_at >= now - timedelta(hours=72):
        return None
    return AlertDraft(
        Alert.RuleKey.DEVICE_OFFLINE_3D,
        Alert.Severity.ATTENTION,
        "Patient device has not connected",
        f"The patient device was last seen at {session.last_seen_at:%-d %b, %-I:%M %p}.",
        {"last_seen_at": session.last_seen_at.isoformat(), "device_session_id": str(session.id)},
    )


def sync_error(patient: PatientProfile, now: datetime) -> AlertDraft | None:
    from apps.sync.models import SyncRejection

    failures = SyncRejection.objects.filter(
        patient_id=patient.id, created_at__gte=now - timedelta(days=7)
    )
    if not failures.exists():
        return None
    return AlertDraft(
        Alert.RuleKey.SYNC_ERROR,
        Alert.Severity.INFO,
        "Some device updates need attention",
        "One or more device updates could not be shared. Patient-facing use is unaffected.",
        {"rejection_ids": [str(x) for x in failures.values_list("id", flat=True)]},
    )


def missed_meds_3in7(patient: PatientProfile, now: datetime) -> AlertDraft | None:
    start = now - timedelta(days=7)
    reminders = list(
        Reminder.objects.filter(
            patient=patient,
            routine_item__category=RoutineItem.Category.MEDICINE,
            scheduled_at__gte=start,
            scheduled_at__lte=now,
        ).order_by("scheduled_at")
    )
    missed = [
        row for row in reminders if row.status in {Reminder.Status.MISSED, Reminder.Status.SKIPPED}
    ]
    if len(missed) < 3:
        return None
    periods = [
        "morning"
        if row.scheduled_at.hour < 12
        else "afternoon"
        if row.scheduled_at.hour < 17
        else "evening"
        for row in missed
    ]
    common = max(set(periods), key=periods.count)
    return AlertDraft(
        Alert.RuleKey.MISSED_MEDS_3_IN_7,
        Alert.Severity.ATTENTION,
        "Several medicine reminders were missed",
        (
            f"Missed {len(missed)} of {len(reminders)} medicine reminders "
            f"between {start:%-d %b} and {now:%-d %b} ({common} dose most often)."
        ),
        {
            "reminder_ids": [str(row.id) for row in missed],
            "missed": len(missed),
            "total": len(reminders),
            "from": start.isoformat(),
            "to": now.isoformat(),
        },
    )


def level_drop_x3(patient: PatientProfile, now: datetime) -> AlertDraft | None:
    start = now - timedelta(days=14)
    changes = list(
        DifficultyChange.objects.filter(
            state__patient=patient, reason_code="demote", created_at__gte=start, created_at__lte=now
        ).select_related("state__game")
    )
    if len(changes) < 3:
        return None
    return AlertDraft(
        Alert.RuleKey.LEVEL_DROP_X3,
        Alert.Severity.ATTENTION,
        "Game levels changed several times",
        (
            f"Difficulty decreased {len(changes)} times across games between "
            f"{start:%-d %b} and {now:%-d %b}. This reflects a pattern, not a single round."
        ),
        {
            "difficulty_change_ids": [str(row.id) for row in changes],
            "count": len(changes),
            "from": start.isoformat(),
            "to": now.isoformat(),
        },
    )


def low_mood_3d(patient: PatientProfile, now: datetime) -> AlertDraft | None:
    from django.utils import timezone

    today = timezone.localdate(now)
    rows = []
    for offset in range(3):
        row = (
            patient.mood_logs.filter(
                logged_at__date=today - timedelta(days=offset), logged_at__lte=now
            )
            .order_by("-logged_at", "-created_at")
            .first()
        )
        if row is None or row.mood not in {"low", "bad"}:
            return None
        rows.append(str(row.id))
    return AlertDraft(
        Alert.RuleKey.LOW_MOOD_3D,
        Alert.Severity.ATTENTION,
        "Low mood recorded for three days",
        "The latest mood entry on each of the last three days was low or bad.",
        {"mood_log_ids": rows},
    )


RULES = (no_login_2d, missed_meds_3in7, level_drop_x3, device_offline_3d, sync_error, low_mood_3d)


def evaluate(patient: PatientProfile, now: datetime) -> list[AlertDraft]:
    return [draft for rule in RULES if (draft := rule(patient, now)) is not None]
