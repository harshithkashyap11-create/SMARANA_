from datetime import timedelta
from uuid import UUID

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime, parse_time
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import DeviceSession, User
from apps.games.models import DifficultyState
from apps.games.services import save_session
from apps.memories.models import Memory, MemoryQuizAttempt
from apps.routines.models import Reminder, ReminderResponse, RoutineItem

from .models import IdempotencyRecord, SyncRejection

SYNC_MODELS = {
    "reminder_response",
    "game_session",
    "difficulty_state",
    "difficulty_change",
    "memory_quiz_attempt",
    "sleep_log",
    "mood_log",
    "sos_event",
    "routine_item",
}


class PushView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        if request.user.role != User.Role.PATIENT:
            return Response({"detail": "Patient device required."}, status=403)
        patient = request.user.patient_profile
        accepted, rejected = [], []
        items = sorted(
            request.data.get("items", []),
            key=lambda x: 0 if x.get("model") == "game_session" else 1,
        )
        for item in items:
            outbox_id, model, payload = (
                item.get("outbox_id"),
                item.get("model"),
                item.get("payload", {}),
            )
            code = None
            if model not in SYNC_MODELS:
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
                    model=model or "",
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
            record, created = IdempotencyRecord.objects.get_or_create(
                key=key,
                defaults={
                    "user": request.user,
                    "model": model,
                    "object_id": UUID(str(item["object_id"])),
                },
            )
            if created:
                try:
                    self._save(model, payload, patient, request.user)
                except Exception:
                    record.delete()
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
        if model == "reminder_response":
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
            if latest is not None and reminder.status != latest.action:
                reminder.status = latest.action
                reminder.save(update_fields=["status", "updated_at"])
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
        elif model == "difficulty_state":
            state = DifficultyState.objects.filter(
                patient=patient, game__key=p["game_key"]
            ).first()
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
        until = timezone.now() + timedelta(days=3)
        reminders = Reminder.objects.filter(
            patient=patient, scheduled_at__lte=until
        ).select_related("routine_item")
        difficulty_states = DifficultyState.objects.filter(patient=patient).select_related("game")
        reminder_records = [
            {
                "id": row.id,
                "title": row.routine_item.title,
                "category": row.routine_item.category,
                "note": row.routine_item.note,
                "scheduled_at": row.scheduled_at,
                "status": row.status,
                "snoozed_until": row.snoozed_until,
            }
            for row in reminders
        ]
        difficulty_records = [
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
            for row in difficulty_states
        ]
        return Response(
            {
                "server_time": timezone.now().isoformat(),
                "records": {
                    "reminders": reminder_records,
                    "difficulty_states": difficulty_records,
                },
            }
        )
