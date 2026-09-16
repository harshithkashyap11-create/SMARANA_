from datetime import timedelta
from uuid import UUID

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime, parse_time
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import DeviceSession, User
from apps.games.models import DifficultyState, GameSession
from apps.games.services import save_session
from apps.memories.models import Memory, MemoryQuizAttempt
from apps.routines.models import Reminder, ReminderResponse, RoutineItem

from .models import IdempotencyRecord, SyncRejection

SYNC_MODELS = {
    "reminder_response",
    "game_session",
    "difficulty_state",
    "memory_quiz_attempt",
    "routine_item",
    "accessibility",
    "patient_profile_favourites",
    "sos_event",
    "sleep_log",
    "mood_log",
}


class PushView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        if request.user.role != User.Role.PATIENT:
            return Response({"detail": "Patient device required."}, status=403)
        patient = request.user.patient_profile
        accepted, rejected = [], []
        raw_items = request.data.get("items", [])
        if not isinstance(raw_items, list) or any(not isinstance(x, dict) for x in raw_items):
            return Response({"detail": "Items must be a list of objects."}, status=400)
        items = sorted(
            raw_items,
            key=lambda x: 0 if x.get("model") == "game_session" else 1,
        )
        for item in items:
            outbox_id, model, payload = (
                item.get("outbox_id"),
                item.get("model"),
                item.get("payload", {}),
            )
            code = None
            if (
                not isinstance(model, str)
                or model not in SYNC_MODELS
                or not isinstance(payload, dict)
            ):
                code = "validation"
            elif str(item.get("patient_id")) != str(patient.id) or str(
                payload.get("patient_id")
            ) != str(patient.id):
                code = "forbidden"
            elif model == "routine_item" and payload.get("source") != "patient":
                code = "forbidden"
            if code:
                SyncRejection.objects.create(
                    user=request.user,
                    patient_id=patient.id,
                    model=model if isinstance(model, str) else "",
                    code=code,
                    detail="Rejected client item",
                )
                rejected.append(
                    {
                        "outbox_id": outbox_id,
                        "code": code,
                        "message": "This item could not be shared.",
                    }
                )
                continue
            key = item.get("idempotency_key", "")
            try:
                # Each item needs a savepoint so database errors cannot poison the batch.
                with transaction.atomic():
                    object_id = UUID(str(item["object_id"]))
                    if not isinstance(key, str) or not key or len(key) > 255:
                        raise ValueError("Invalid idempotency key")
                    if model != "difficulty_state" and UUID(str(payload.get("id"))) != object_id:
                        raise ValueError("Object id does not match payload")
                    record, created = IdempotencyRecord.objects.get_or_create(
                        key=key,
                        defaults={"user": request.user, "model": model, "object_id": object_id},
                    )
                    if (
                        record.user_id != request.user.id
                        or record.model != model
                        or record.object_id != object_id
                    ):
                        raise ValueError("Idempotency key belongs to another item")
                    if created:
                        self._save(model, payload, patient, request.user)
            except Exception:
                SyncRejection.objects.create(
                    user=request.user,
                    patient_id=patient.id,
                    model=model,
                    code="validation",
                    detail="Rejected client item",
                )
                rejected.append(
                    {
                        "outbox_id": outbox_id,
                        "code": "validation",
                        "message": "This item could not be shared.",
                    }
                )
                continue
            accepted.append({"outbox_id": outbox_id, "object_id": str(record.object_id)})
        DeviceSession.objects.filter(user=request.user).update(
            last_seen_at=timezone.now(),
            last_push_had_rejections=bool(rejected),
        )
        return Response(
            {"accepted": accepted, "rejected": rejected, "server_time": timezone.now().isoformat()}
        )

    def _save(self, model, p, patient, user):
        from apps.alerts.models import SosEvent

        owned_models = {
            "reminder_response": (ReminderResponse, "reminder__patient_id"),
            "game_session": (GameSession, "patient_id"),
            "memory_quiz_attempt": (MemoryQuizAttempt, "patient_id"),
            "routine_item": (RoutineItem, "patient_id"),
            "sos_event": (SosEvent, "patient_id"),
        }
        if model in owned_models:
            record_model, owner_field = owned_models[model]
            existing = record_model.objects.filter(id=p["id"])
            if existing.exists():
                if not existing.filter(**{owner_field: patient.id}).exists():
                    raise ValueError("Object belongs to another patient")
                # Append-only replay must never recompute DDA or replace server records.
                return
        if model in ("sleep_log", "mood_log"):
            from apps.routines.models import MoodLog, SleepLog
            from apps.routines.serializers import MoodLogSerializer, SleepLogSerializer
            from apps.routines.wellness import save_log

            cls, serializer_cls = (
                (MoodLog, MoodLogSerializer)
                if model == "mood_log"
                else (SleepLog, SleepLogSerializer)
            )
            existing = cls.objects.filter(id=p["id"]).first()
            if existing:
                if existing.patient_id != patient.id:
                    raise ValueError("Object belongs to another patient")
                return
            serializer = serializer_cls(data=p)
            serializer.is_valid(raise_exception=True)
            save_log(serializer, patient, user)
        elif model == "reminder_response":
            if p.get("action") not in ReminderResponse.Action.values:
                raise ValueError("Invalid reminder action")
            reminder = Reminder.objects.filter(id=p["reminder_id"], patient=patient).first()
            if reminder is None:
                # A device may have generated this reminder beyond the cached horizon.
                from apps.routines.services import materialise_reminders

                responded_at = parse_datetime(p["responded_at"])
                if responded_at is None:
                    raise ValueError("Invalid response time")
                scheduled_at = parse_datetime(p.get("scheduled_at", "")) or responded_at
                materialise_reminders(patient, timezone.localdate(scheduled_at), days=1)
                reminder = Reminder.objects.get(id=p["reminder_id"], patient=patient)
            ReminderResponse.objects.get_or_create(
                id=p["id"],
                defaults={
                    "reminder": reminder,
                    "action": p["action"],
                    "responded_at": parse_datetime(p["responded_at"]),
                    "idempotency_key": p["id"],
                },
            )
            latest = reminder.responses.order_by("-responded_at", "-created_at").first()
            if latest is not None:
                reminder.status = latest.action
                reminder.snoozed_until = (
                    latest.responded_at + timedelta(minutes=15)
                    if latest.action == "later"
                    else None
                )
                reminder.save(update_fields=["status", "snoozed_until", "updated_at"])
        elif model == "game_session":
            save_session(
                patient,
                user,
                {
                    **p,
                    "started_at": parse_datetime(p["started_at"]),
                    "ended_at": parse_datetime(p["ended_at"]),
                },
            )
        elif model == "memory_quiz_attempt":
            if (
                p.get("memory_id")
                and not Memory.objects.filter(id=p["memory_id"], patient=patient).exists()
            ):
                raise ValueError("Unknown patient memory")
            MemoryQuizAttempt.objects.get_or_create(
                id=p["id"],
                defaults={
                    "patient": patient,
                    "memory": Memory.objects.filter(id=p.get("memory_id"), patient=patient).first(),
                    "question_type": p["question_type"],
                    "expected": p["expected"],
                    "given": p["given"],
                    "correct": p["correct"],
                    "attempted_at": parse_datetime(p["attempted_at"]),
                    "response_ms": p["response_ms"],
                    "device_updated_at": parse_datetime(p["device_updated_at"]),
                    "idempotency_key": p["id"],
                },
            )
        elif model == "routine_item":
            RoutineItem.objects.get_or_create(
                id=p["id"],
                defaults={
                    "patient": patient,
                    "title": p["title"],
                    "category": "custom",
                    "time_of_day": parse_time(p["time_of_day"]),
                    "days_of_week": [parse_date(p["start_date"]).weekday()],
                    "start_date": parse_date(p["start_date"]),
                    "end_date": parse_date(p["start_date"]),
                    "source": "patient",
                    "created_by": user,
                },
            )
        elif model == "sos_event":
            from apps.alerts.services import create_sos

            triggered_at = parse_datetime(p["triggered_at"])
            if triggered_at is None or timezone.is_naive(triggered_at):
                raise ValueError("Invalid SOS time")
            create_sos(
                patient=patient,
                idempotency_key=p["id"],
                event_id=UUID(p["id"]),
                triggered_at=triggered_at,
            )
        elif model == "patient_profile_favourites":
            from apps.patients.models import PatientProfile

            values = p.get("favourites")
            stamp = parse_datetime(p.get("device_updated_at", ""))
            if str(p["id"]) != str(patient.id) or stamp is None or timezone.is_naive(stamp):
                raise ValueError("Invalid favourites owner or time")
            if (
                not isinstance(values, list)
                or len(values) > 100
                or any(
                    not isinstance(value, dict)
                    or set(value) != {"kind", "id"}
                    or value["kind"] not in {"game", "memory"}
                    or not isinstance(value["id"], str)
                    for value in values
                )
            ):
                raise ValueError("Invalid favourites")
            from apps.games.models import GameDefinition

            for value in values:
                if value["kind"] == "game":
                    if not GameDefinition.objects.filter(key=value["id"]).exists():
                        raise ValueError("Unknown game")
                elif not Memory.objects.filter(id=value["id"], patient=patient).exists():
                    raise ValueError("Unknown memory")
            locked = PatientProfile.objects.select_for_update().get(id=patient.id)
            if locked.favourites_updated_at is None or stamp > locked.favourites_updated_at:
                locked.favourites = values
                locked.favourites_updated_at = stamp
                locked.save(update_fields=["favourites", "favourites_updated_at", "updated_at"])
        elif model == "accessibility":
            from apps.patients.accessibility import save_accessibility

            if str(p["id"]) != str(patient.id):
                raise ValueError("Invalid settings owner")
            save_accessibility(
                patient, user, p.get("settings", {}), parse_datetime(p["device_updated_at"])
            )
        elif model == "difficulty_state":
            state = DifficultyState.objects.filter(patient=patient, game__key=p["game_key"]).first()
            if state is not None and state.level != p.get("level"):
                import logging

                logging.getLogger(__name__).warning(
                    "dda_mismatch patient=%s game=%s client=%s server=%s",
                    patient.id,
                    p["game_key"],
                    p.get("level"),
                    state.level,
                )


class PullView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != User.Role.PATIENT:
            return Response({"detail": "Patient device required."}, status=403)
        patient = request.user.patient_profile
        from .pull import pull_records

        since = request.query_params.get("since")
        cursor = parse_datetime(since) if since else None
        if since and (cursor is None or timezone.is_naive(cursor) or cursor > timezone.now()):
            return Response(
                {"detail": "since must be a timezone-aware past timestamp."}, status=400
            )
        server_time = timezone.now()
        return Response(
            {
                "server_time": server_time.isoformat(),
                "patient_id": str(patient.id),
                "records": pull_records(patient, cursor, server_time),
            }
        )
