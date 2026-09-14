from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.routines.models import RoutineItem
from apps.routines.services import materialise_reminders


@receiver(post_save, sender=RoutineItem)
def materialise_after_routine_save(
    sender: type[RoutineItem], instance: RoutineItem, **kwargs: object
) -> None:
    del sender, kwargs
    materialise_reminders(instance.patient, timezone.localdate())
