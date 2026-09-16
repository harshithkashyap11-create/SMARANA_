"""Chronological caregiver master log."""

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework.exceptions import ValidationError

from apps.games.models import DifficultyChange
from apps.routines.models import ReminderResponse


def timeline(patient, params):
    def boundary(key, end=False):
        raw = params.get(key)
        if not raw:
            return None
        try:
            stamp = parse_datetime(raw)
        except ValueError:
            raise ValidationError({key: "Use a valid date or timestamp."}) from None
        if stamp is None:
            try:
                day = parse_date(raw)
            except ValueError:
                raise ValidationError({key: "Use a valid date."}) from None
            if day is None:
                raise ValidationError({key: "Use a date or timestamp."})
            from datetime import datetime, time

            stamp = datetime.combine(day, time.max if end else time.min)
        return timezone.make_aware(stamp) if timezone.is_naive(stamp) else stamp

    start, end = boundary("from"), boundary("to", True)
    if start and end and start > end:
        raise ValidationError("from must precede to.")
    events = []
    sources = [
        (
            "exercise_assignment",
            patient.exercise_assignments.select_related("game"),
            "created_at",
            lambda x: x.game.name,
        ),
        (
            "session",
            patient.game_sessions.select_related("game"),
            "ended_at",
            lambda x: x.game.name,
        ),
        (
            "response",
            ReminderResponse.objects.filter(reminder__patient=patient),
            "responded_at",
            lambda x: x.action,
        ),
        (
            "note",
            patient.clinical_notes.exclude(visibility="doctor_only"),
            "created_at",
            lambda x: x.text,
        ),
        ("alert", patient.alerts.all(), "triggered_at", lambda x: x.title),
        ("sos", patient.sos_events.all(), "triggered_at", lambda x: "Help requested"),
        (
            "difficulty",
            DifficultyChange.objects.filter(state__patient=patient),
            "created_at",
            lambda x: x.explanation,
        ),
        (
            "care_assignment",
            patient.care_assignments.all(),
            "assigned_at",
            lambda x: x.caregiver.display_name,
        ),
        (
            "doctor_assignment",
            patient.doctor_assignments.all(),
            "assigned_at",
            lambda x: x.doctor.display_name,
        ),
    ]
    for kind, rows, field, title in sources:
        if start:
            rows = rows.filter(**{f"{field}__gte": start})
        if end:
            rows = rows.filter(**{f"{field}__lte": end})
        events += [
            {"id": str(x.id), "kind": kind, "at": getattr(x, field).isoformat(), "title": title(x)}
            for x in rows
        ]
    return sorted(events, key=lambda x: (x["at"], x["kind"], x["id"]))
