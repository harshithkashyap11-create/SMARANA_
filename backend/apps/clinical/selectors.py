"""Read models for assignment-scoped doctor views."""

from typing import Any

from django.db.models import Count, Max, Q
from django.utils import timezone

from apps.accounts.models import User
from apps.clinical.models import ExerciseAssignment
from apps.patients.selectors import patients_for


def doctor_dashboard(doctor: User) -> dict[str, list[dict[str, Any]]]:
    """Return the small, stable dashboard contract for an assigned doctor."""

    now = timezone.now()
    patients = patients_for(doctor).annotate(
        last_session_at=Max("game_sessions__ended_at"),
        flag_count=Count(
            "alerts",
            filter=Q(alerts__status="open"),
            distinct=True,
        ),
    )
    cards: list[dict[str, Any]] = []
    for patient in patients:
        last_session_at = patient.last_session_at
        age_days = (now.date() - last_session_at.date()).days if last_session_at else None
        if age_days is not None and age_days <= 3:
            engagement_status = "active"
        elif age_days is not None and age_days <= 7:
            engagement_status = "quiet"
        else:
            engagement_status = "inactive"
        cards.append(
            {
                "id": str(patient.id),
                "name": patient.user.display_name,
                "flag_count": patient.flag_count,
                "last_session_at": last_session_at,
                "engagement_status": engagement_status,
            }
        )
    cards.sort(key=lambda card: card["name"])
    return {
        "patients": cards,
        "needs_attention": [card for card in cards if card["flag_count"] > 0],
        "reviews_due": [
            card for card in cards
            if ExerciseAssignment.objects.filter(
                patient_id=card["id"], active=True, review_date__lte=timezone.localdate()
            ).exists()
        ],
        "recent_completed": [card for card in cards if card["last_session_at"] is not None],
    }
