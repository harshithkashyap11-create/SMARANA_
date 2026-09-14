"""Deterministic reminder generation and response handling."""

from datetime import date, datetime, timedelta
from uuid import UUID, uuid5

from django.db import transaction
from django.utils import timezone

from apps.patients.models import PatientProfile
from apps.routines.models import Reminder, ReminderResponse

SMARANA_NS = UUID("c64f5d1d-63d5-4b1f-9852-5e6437b78a30")


def reminder_id_for(routine_item_id: UUID, day: date) -> UUID:
    return uuid5(SMARANA_NS, f"{routine_item_id}:{day.isoformat()}")


def materialise_reminders(
    patient: PatientProfile, from_date: date, days: int = 3
) -> list[Reminder]:
    reminders: list[Reminder] = []
    for offset in range(days):
        day = from_date + timedelta(days=offset)
        for item in patient.routine_items.filter(start_date__lte=day).filter(
            end_date__isnull=True
        ) | patient.routine_items.filter(start_date__lte=day, end_date__gte=day):
            if day.weekday() not in item.days_of_week:
                continue
            scheduled_at = timezone.make_aware(datetime.combine(day, item.time_of_day))
            reminder, _ = Reminder.objects.get_or_create(
                id=reminder_id_for(item.id, day),
                defaults={"routine_item": item, "patient": patient, "scheduled_at": scheduled_at},
            )
            reminders.append(reminder)
    return reminders


@transaction.atomic
def record_response(
    *, reminder: Reminder, action: str, responded_at: datetime, idempotency_key: UUID
) -> ReminderResponse:
    response, created = ReminderResponse.objects.get_or_create(
        idempotency_key=idempotency_key,
        defaults={"reminder": reminder, "action": action, "responded_at": responded_at},
    )
    if created:
        reminder.status = action
        reminder.snoozed_until = responded_at + timedelta(minutes=15) if action == "later" else None
        reminder.save(update_fields=["status", "snoozed_until", "updated_at"])
    return response
