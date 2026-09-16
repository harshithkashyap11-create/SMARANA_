"""Patient-scoped sync snapshots, incremental changes, and deletion tombstones."""

from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from apps.clinical.models import ExerciseAssignment
from apps.games.models import DifficultyState, GameDefinition
from apps.games.serializers import GameDefinitionSerializer
from apps.memories.models import Memory
from apps.memories.serializers import MemorySerializer
from apps.patients.models import FamilyMember
from apps.patients.serializers import FamilyMemberSerializer, PatientProfileCaregiverSerializer
from apps.routines.models import Medication, Reminder, ReminderResponse, RoutineItem
from apps.routines.serializers import (
    MedicationSerializer,
    MoodLogSerializer,
    ReminderSerializer,
    RoutineItemSerializer,
    SleepLogSerializer,
)
from apps.routines.services import materialise_reminders


def pull_records(patient, since, server_time):
    # Always materialise the horizon. Records created after the snapshot cursor are
    # harmless duplicates on the next pull and must never be skipped.
    materialise_reminders(patient, timezone.localdate(server_time), days=3)

    def changed(queryset):
        return queryset.filter(updated_at__gte=since) if since else queryset

    rules = RoutineItem.all_objects.filter(patient=patient)
    family = FamilyMember.all_objects.filter(patient=patient)
    memories = Memory.all_objects.filter(patient=patient).prefetch_related("people", "media")
    reminders = Reminder.objects.filter(
        patient=patient,
        routine_item__deleted_at__isnull=True,
        scheduled_at__lt=server_time + timedelta(days=3),
    ).select_related("routine_item")
    if since:
        # Include a newly reached horizon even when a pre-created reminder's
        # updated_at predates the cursor. Title/note edits also affect reminders.
        reminders = reminders.filter(
            Q(updated_at__gte=since)
            | Q(routine_item__updated_at__gte=since)
            | Q(scheduled_at__gte=since)
        )
    memory_changes = memories
    if since:
        memory_changes = memories.filter(
            Q(updated_at__gte=since)
            | Q(media__updated_at__gte=since)
            | Q(people__updated_at__gte=since)
        ).distinct()
    consent = getattr(patient, "consent", None)
    profile = {
        "id": str(patient.id),
        "name": patient.user.display_name,
        **PatientProfileCaregiverSerializer(patient).data,
        "favourites": patient.favourites,
        "session_cap_minutes": patient.session_cap_minutes,
        "max_difficulty_level": patient.max_difficulty_level,
        "use_memories_in_quiz": bool(consent and consent.use_memories_in_quiz),
    }
    response_rows = changed(ReminderResponse.objects.filter(reminder__patient=patient))
    return {
        # Profile is tiny; return it on every pull so user and consent updates
        # cannot be lost merely because they don't update PatientProfile.
        "profile": [profile],
        "checkins": [
            {"id": str(row.id), "requested_by": row.requested_by.display_name,
             "answer": getattr(getattr(row, "response", None), "answer", None)}
            for row in changed(patient.checkins.all()).select_related("requested_by", "response")
        ],
        "sleep_logs": SleepLogSerializer(changed(patient.sleep_logs.all()), many=True).data,
        "mood_logs": MoodLogSerializer(changed(patient.mood_logs.all()), many=True).data,
        "exercise_assignments": [
            {
                "id": row.game.key,
                "due": timezone.localdate(server_time).isoformat(),
                "slot": row.time_slot,
            }
            for row in ExerciseAssignment.objects.filter(
                patient=patient, active=True, review_date__gte=timezone.localdate(server_time)
            ).select_related("game")
        ],
        "reminder_responses": [
            {
                "id": str(row.id),
                "reminder_id": str(row.reminder_id),
                "action": row.action,
                "responded_at": row.responded_at,
            }
            for row in response_rows
        ],
        "routine_items": RoutineItemSerializer(
            changed(rules).filter(deleted_at=None), many=True
        ).data,
        "family_members": FamilyMemberSerializer(
            changed(family).filter(deleted_at=None), many=True
        ).data,
        "memories": MemorySerializer(memory_changes.filter(deleted_at=None), many=True).data,
        "medications": MedicationSerializer(
            changed(Medication.objects.filter(patient=patient)), many=True
        ).data,
        "reminders": ReminderSerializer(reminders, many=True).data,
        "game_definitions": GameDefinitionSerializer(
            changed(GameDefinition.objects.filter(active=True)), many=True
        ).data,
        "difficulty_states": [
            {
                "id": f"{patient.id}:{row.game.key}",
                "game_key": row.game.key,
                "level": row.level,
                "window": row.window,
                "locked_by_doctor": row.locked_by_doctor,
                "cap_level": row.cap_level,
                "min_level": row.game.min_level,
                "max_level": row.game.max_level,
            }
            for row in changed(DifficultyState.objects.filter(patient=patient)).select_related(
                "game"
            )
        ],
        "deleted": [
            {"model": name, "id": str(row.id)}
            for name, rows in (
                ("routine_items", rules),
                ("family_members", family),
                ("memories", memories),
            )
            for row in rows.filter(deleted_at__isnull=False)
            if since is None or row.deleted_at >= since
        ],
    }
