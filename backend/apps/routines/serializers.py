from rest_framework import serializers

from apps.routines.models import Medication, Reminder, ReminderResponse, RoutineItem


class RoutineItemSerializer(serializers.ModelSerializer):
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


class RoutineHistorySerializer(serializers.Serializer):
    id = serializers.UUIDField()
    actor_name = serializers.CharField(allow_null=True)
    actor_role = serializers.CharField()
    action = serializers.CharField()
    changes = serializers.DictField()
    created_at = serializers.DateTimeField()


class ReminderSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="routine_item.title")
    category = serializers.CharField(source="routine_item.category")
    note = serializers.CharField(source="routine_item.note")

    class Meta:
        model = Reminder
        fields = ("id", "title", "category", "note", "scheduled_at", "status", "snoozed_until")


class AdherenceReminderSerializer(ReminderSerializer):
    responded_at = serializers.SerializerMethodField()

    class Meta(ReminderSerializer.Meta):
        fields = (*ReminderSerializer.Meta.fields, "responded_at")

    def get_responded_at(self, obj: Reminder):
        response = obj.responses.order_by("-responded_at").first()
        return response.responded_at if response else None


class ReminderResponseInputSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=ReminderResponse.Action.choices)
    responded_at = serializers.DateTimeField()
    idempotency_key = serializers.UUIDField()


class ReminderResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReminderResponse
        fields = ("id", "reminder", "action", "responded_at", "idempotency_key")


class MedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medication
        fields = ("id", "name", "dose", "times", "instructions", "active", "start_date", "end_date")
