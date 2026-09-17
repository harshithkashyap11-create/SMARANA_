from typing import Any

from rest_framework import serializers

from apps.clinical.models import ClinicalBaseline, ClinicalNote, DdaOverride, ExerciseAssignment


class DdaOverrideInputSerializer(serializers.Serializer[dict[str, object]]):
    action = serializers.ChoiceField(choices=DdaOverride.Action.choices)
    value = serializers.IntegerField(min_value=1, max_value=10, required=False, allow_null=True)
    reason = serializers.CharField(max_length=4000)


class ClinicalNoteSerializer(serializers.ModelSerializer[ClinicalNote]):
    author_name = serializers.CharField(source="author.display_name", read_only=True)

    class Meta:
        model = ClinicalNote
        fields = [
            "id",
            "author_name",
            "category",
            "status_summary",
            "visibility",
            "text",
            "follow_up_date",
            "reply_to",
            "created_at",
        ]
        read_only_fields = ["id", "author_name", "created_at"]


class ClinicalBaselineSerializer(serializers.ModelSerializer[ClinicalBaseline]):
    ideal_session_minutes = serializers.IntegerField(
        min_value=1, max_value=120, allow_null=True, required=False
    )
    max_difficulty_level = serializers.IntegerField(
        min_value=1, max_value=10, allow_null=True, required=False
    )
    recorded_by_name = serializers.CharField(source="recorded_by.display_name", read_only=True)

    class Meta:
        model = ClinicalBaseline
        fields = [
            "id",
            "allergies",
            "diagnoses",
            "assessment_scores",
            "visual_limits",
            "motor_limits",
            "ideal_session_minutes",
            "max_difficulty_level",
            "recorded_by_name",
            "updated_at",
        ]
        read_only_fields = ["id", "recorded_by_name", "updated_at"]


class ExerciseAssignmentSerializer(serializers.ModelSerializer[ExerciseAssignment]):
    start_level = serializers.IntegerField(min_value=1, max_value=10)
    target_minutes = serializers.IntegerField(min_value=1, max_value=120)
    times_per_week = serializers.IntegerField(min_value=1, max_value=7)

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        game = attrs.get("game", getattr(self.instance, "game", None))
        level = attrs.get("start_level", getattr(self.instance, "start_level", None))
        if game and (not game.active or not game.min_level <= level <= game.max_level):
            raise serializers.ValidationError("Choose an active game and a level in its range.")
        return attrs

    game_name = serializers.CharField(source="game.name", read_only=True)
    completion = serializers.SerializerMethodField()

    class Meta:
        model = ExerciseAssignment
        fields = [
            "id",
            "game",
            "game_name",
            "start_level",
            "target_minutes",
            "times_per_week",
            "time_slot",
            "review_date",
            "active",
            "notes",
            "completion",
        ]
        read_only_fields = ["id", "game_name", "completion"]

    def get_completion(self, obj: ExerciseAssignment) -> dict[str, int]:
        from datetime import timedelta

        from django.utils import timezone

        start = timezone.localdate() - timedelta(days=timezone.localdate().weekday())
        return {
            "planned_this_week": obj.times_per_week,
            "done_this_week": obj.patient.game_sessions.filter(
                game=obj.game,
                guest_mode=False,
                ended_at__date__gte=start,
                metrics__completed=True,
            ).count(),
        }
