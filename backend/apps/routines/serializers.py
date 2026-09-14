from rest_framework import serializers

from apps.routines.models import Medication, Reminder, ReminderResponse, RoutineItem


class RoutineItemSerializer(serializers.ModelSerializer):
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
        )
        read_only_fields = fields


class ReminderSerializer(serializers.ModelSerializer):
    title = serializers.CharField(source="routine_item.title")
    category = serializers.CharField(source="routine_item.category")
    note = serializers.CharField(source="routine_item.note")

    class Meta:
        model = Reminder
        fields = ("id", "title", "category", "note", "scheduled_at", "status", "snoozed_until")


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
