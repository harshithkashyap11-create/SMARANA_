from datetime import datetime

from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from apps.routines.models import (
    Medication,
    MoodLog,
    Reminder,
    ReminderResponse,
    RoutineItem,
    SleepLog,
)


class RoutineItemSerializer(serializers.ModelSerializer[RoutineItem]):
    set_by = serializers.CharField(
        source="created_by.display_name", read_only=True, allow_null=True
    )

    class Meta:
        model = RoutineItem
        fields = (
            "id",
            "title",
            "category",
            "time_of_day",
            "days_of_week",
            "start_date",
            "end_date",
            "icon",
            "note",
            "source",
            "set_by",
        )
        read_only_fields = ("id", "source", "set_by")

    def validate_days_of_week(self, value: list[int]) -> list[int]:
        if not value or any(day not in range(7) for day in value):
            raise serializers.ValidationError("Choose at least one valid day.")
        return sorted(set(value))


class RoutineHistorySerializer(serializers.Serializer[object]):
    id = serializers.UUIDField()
    actor_name = serializers.CharField(allow_null=True)
    actor_role = serializers.CharField()
    action = serializers.CharField()
    changes = serializers.DictField()
    created_at = serializers.DateTimeField()


class ReminderSerializer(serializers.ModelSerializer[Reminder]):
    title = serializers.CharField(source="routine_item.title")
    category = serializers.CharField(source="routine_item.category")
    note = serializers.CharField(source="routine_item.note")

    class Meta:
        model = Reminder
        fields: tuple[str, ...] = (
            "id",
            "title",
            "category",
            "note",
            "scheduled_at",
            "status",
            "snoozed_until",
        )


class AdherenceReminderSerializer(ReminderSerializer):
    responded_at = serializers.SerializerMethodField()

    class Meta(ReminderSerializer.Meta):
        fields = (*ReminderSerializer.Meta.fields, "responded_at")

    def get_responded_at(self, obj: Reminder) -> datetime | None:
        response = obj.responses.order_by("-responded_at").first()
        return response.responded_at if response else None


class ReminderResponseInputSerializer(serializers.Serializer[dict[str, object]]):
    action = serializers.ChoiceField(choices=ReminderResponse.Action.choices)
    responded_at = serializers.DateTimeField()
    idempotency_key = serializers.UUIDField()


class ReminderResponseSerializer(serializers.ModelSerializer[ReminderResponse]):
    class Meta:
        model = ReminderResponse
        fields = ("id", "reminder", "action", "responded_at", "idempotency_key")


class MedicationSerializer(serializers.ModelSerializer[Medication]):
    class Meta:
        model = Medication
        fields = ("id", "name", "dose", "times", "instructions", "active", "start_date", "end_date")


class SleepLogSerializer(serializers.ModelSerializer[SleepLog]):
    quality = serializers.IntegerField(min_value=1, max_value=5)
    device_updated_at = serializers.DateTimeField(required=False)
    id = serializers.UUIDField(
        required=False, validators=[UniqueValidator(queryset=SleepLog.objects.all())]
    )

    class Meta:
        model = SleepLog
        fields = ("id", "date", "bed_time", "wake_time", "quality", "source", "device_updated_at")
        read_only_fields = ("source",)


class MoodLogSerializer(serializers.ModelSerializer[MoodLog]):
    device_updated_at = serializers.DateTimeField(required=False)
    id = serializers.UUIDField(
        required=False, validators=[UniqueValidator(queryset=MoodLog.objects.all())]
    )

    class Meta:
        model = MoodLog
        fields = ("id", "logged_at", "mood", "note", "source", "device_updated_at")
        read_only_fields = ("source",)
