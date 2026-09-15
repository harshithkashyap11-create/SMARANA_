from datetime import timedelta

from django.utils import timezone

from apps.accounts.models import DeviceSession, User
from apps.alerts.models import Alert
from apps.patients.models import CareAssignment, DoctorAssignment


def admin_counts(request) -> dict[str, object]:
    if not request.path.startswith("/admin/") or not request.user.is_staff:
        return {}
    cutoff = timezone.now() - timedelta(days=7)
    stale = timezone.now() - timedelta(hours=72)
    return {
        "smarana_counts": {
            "patients": User.objects.filter(role=User.Role.PATIENT, is_active=True).count(),
            "caregivers": User.objects.filter(role=User.Role.CAREGIVER, is_active=True).count(),
            "doctors": User.objects.filter(role=User.Role.DOCTOR, is_active=True).count(),
            "active_7d": DeviceSession.objects.filter(last_seen_at__gte=cutoff)
            .values("user")
            .distinct()
            .count(),
            "pending_approvals": User.objects.filter(
                role__in=[User.Role.DOCTOR, User.Role.CAREGIVER], is_approved=False, is_active=True
            ).count(),
            "open_assignments": CareAssignment.objects.filter(active=True).count()
            + DoctorAssignment.objects.filter(active=True).count(),
            "open_sos": Alert.objects.filter(rule_key="sos", status="open").count(),
            "devices_unsynced": DeviceSession.objects.filter(last_seen_at__lt=stale).count(),
        }
    }
