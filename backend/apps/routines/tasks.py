from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from apps.patients.models import PatientProfile
from apps.routines.models import Reminder
from apps.routines.services import materialise_reminders


@shared_task
def materialise_all_reminders() -> int:
    today = timezone.localdate()
    return sum(
        len(materialise_reminders(patient, today)) for patient in PatientProfile.objects.all()
    )


@shared_task
def mark_missed_reminders() -> int:
    cutoff = timezone.now() - timedelta(minutes=60)
    return Reminder.objects.filter(
        status=Reminder.Status.PENDING,
        scheduled_at__lte=cutoff,
        routine_item__deleted_at__isnull=True,
    ).update(status=Reminder.Status.MISSED)
