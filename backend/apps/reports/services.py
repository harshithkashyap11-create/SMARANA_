"""Scoped, descriptive PDF exports. No remote resources are fetched by the renderer."""

import base64
from collections import defaultdict
from datetime import date, datetime, time, timedelta
from io import BytesIO
from typing import Any

from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone
from matplotlib.backends.backend_agg import FigureCanvasAgg
from matplotlib.figure import Figure
from weasyprint import HTML

from apps.accounts.models import User
from apps.audit.services import audit
from apps.clinical.models import ClinicalNote
from apps.games.models import DifficultyChange
from apps.patients.models import PatientProfile
from apps.routines.models import Reminder

DISCLAIMER = "Engagement and tracking support, not a diagnosis."


def chart(domains: list[dict[str, Any]]) -> str | None:
    if not domains:
        return None
    figure = Figure(figsize=(7, max(2.5, len(domains) * 0.45)), layout="constrained")
    FigureCanvasAgg(figure)
    axes = figure.subplots()
    axes.barh([x["name"] for x in domains], [x["accuracy"] * 100 for x in domains], color="#24634b")
    axes.set_xlim(0, 100)
    axes.set_xlabel("Mean completed-session accuracy (%)")
    image = BytesIO()
    figure.savefig(image, format="png", dpi=160)
    return "data:image/png;base64," + base64.b64encode(image.getvalue()).decode()


def local_resources(url: str, *args: Any, **kwargs: Any) -> Any:
    if not url.startswith("data:image/png;base64,"):
        raise ValueError("External PDF resources are disabled")
    return {"string": base64.b64decode(url.split(",", 1)[1]), "mime_type": "image/png"}


def render_pdf(template: str, context: dict[str, Any]) -> bytes:
    html = render_to_string(template, context)
    return HTML(string=html, url_fetcher=local_resources).write_pdf()


def report_pdf(patient: PatientProfile, actor: User, start: date, end: date) -> bytes:
    zone = timezone.get_current_timezone()
    lower = timezone.make_aware(datetime.combine(start, time.min), zone)
    upper = timezone.make_aware(datetime.combine(end + timedelta(days=1), time.min), zone)
    sessions = list(
        patient.game_sessions.filter(guest_mode=False, ended_at__gte=lower, ended_at__lt=upper)
        .select_related("game")
        .order_by("ended_at")
    )
    grouped: dict[str, list[float]] = defaultdict(list)
    for row in sessions:
        if row.metrics.get("completed") and isinstance(row.metrics.get("accuracy"), (int, float)):
            for domain in row.game.cognitive_domains:
                grouped[domain].append(float(row.metrics["accuracy"]))
    domains = [
        {
            "name": key,
            "accuracy": sum(values) / len(values),
            "count": len(values),
            "first": values[0],
            "last": values[-1],
        }
        for key, values in sorted(grouped.items())
    ]
    notes = patient.clinical_notes.filter(created_at__gte=lower, created_at__lt=upper)
    if actor.role != User.Role.DOCTOR:
        notes = notes.exclude(visibility=ClinicalNote.Visibility.DOCTOR_ONLY)
    notes = notes.select_related("author")
    reminders = patient.routine_reminders.filter(scheduled_at__gte=lower, scheduled_at__lt=upper)
    counts = {status: reminders.filter(status=status).count() for status in Reminder.Status.values}
    pdf = render_pdf(
        "reports/report.html",
        {
            "patient": patient,
            "start": start,
            "end": end,
            "variant": "Clinical" if actor.role == User.Role.DOCTOR else "Caregiver",
            "disclaimer": DISCLAIMER,
            "sessions": sessions,
            "domains": domains,
            "chart": chart(domains),
            "adherence": counts,
            "reminder_total": reminders.count(),
            "changes": DifficultyChange.objects.filter(
                state__patient=patient, created_at__gte=lower, created_at__lt=upper
            ).select_related("state__game"),
            "flags": patient.alerts.filter(triggered_at__gte=lower, triggered_at__lt=upper),
            "caregiver_notes": notes.filter(author__role=User.Role.CAREGIVER),
            "doctor_notes": notes.filter(author__role=User.Role.DOCTOR),
            "assignments": patient.exercise_assignments.filter(active=True).select_related("game"),
        },
    )
    audit(
        actor,
        "export",
        patient,
        patient=patient,
        changes={
            "kind": "report",
            "variant": actor.role,
            "from": start.isoformat(),
            "to": end.isoformat(),
        },
    )
    return pdf


def emergency_pdf(patient: PatientProfile, actor: User) -> bytes:
    today = timezone.localdate()
    pdf = render_pdf(
        "reports/emergency.html",
        {
            "patient": patient,
            "today": today,
            "baseline": getattr(patient, "clinical_baseline", None),
            "medications": patient.medications.filter(active=True, start_date__lte=today).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=today)
            ),
            "contacts": patient.family_members.filter(is_emergency_contact=True),
            "caregivers": patient.care_assignments.filter(active=True).select_related("caregiver"),
            "doctors": patient.doctor_assignments.filter(active=True).select_related("doctor"),
        },
    )
    audit(actor, "export", patient, patient=patient, changes={"kind": "emergency_card"})
    return pdf
