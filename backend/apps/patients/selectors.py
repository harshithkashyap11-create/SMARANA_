"""Assignment-scoped patient queries."""

from django.db.models import BooleanField, Count, Exists, Max, OuterRef, Q, Subquery
from django.db.models.query import QuerySet

from apps.accounts.models import DeviceSession, User
from apps.patients.models import CareAssignment, PatientProfile


def patients_for(user: User) -> QuerySet[PatientProfile]:
    """Return only patients visible to the supplied API user."""

    primary_caregiver = CareAssignment.objects.filter(
        patient=OuterRef("pk"), active=True, is_primary=True
    ).values("caregiver__display_name")[:1]
    latest_device = DeviceSession.objects.filter(user=OuterRef("user_id")).order_by(
        "-last_seen_at"
    )
    queryset = PatientProfile.objects.select_related("user").annotate(
        last_active_at=Max("user__device_sessions__last_seen_at"),
        open_alert_count=Count("alerts", filter=Q(alerts__status="open"), distinct=True),
        primary_caregiver_name=Subquery(primary_caregiver),
        last_push_had_rejections=Subquery(
            latest_device.values("last_push_had_rejections")[:1]
        ),
        is_primary=Exists(
            CareAssignment.objects.filter(
                patient=OuterRef("pk"), caregiver=user, active=True, is_primary=True
            ),
            output_field=BooleanField(),
        ),
    ).order_by("user__username", "id")
    if user.role == User.Role.PATIENT:
        return queryset.filter(user=user)
    if user.role == User.Role.CAREGIVER:
        return queryset.filter(
            care_assignments__caregiver=user,
            care_assignments__active=True,
        ).distinct()
    if user.role == User.Role.DOCTOR:
        return queryset.filter(
            doctor_assignments__doctor=user,
            doctor_assignments__active=True,
        ).distinct()
    return queryset.none()
