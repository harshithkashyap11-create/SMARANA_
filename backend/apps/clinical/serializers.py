from rest_framework import serializers

from apps.clinical.models import ClinicalBaseline, ClinicalNote, ExerciseAssignment


class ClinicalNoteSerializer(serializers.ModelSerializer[ClinicalNote]):
    author_name = serializers.CharField(source="author.display_name", read_only=True)

    class Meta:
        model = ClinicalNote
        fields = [
            "id", "author_name", "category", "status_summary", "visibility", "text",
            "follow_up_date", "reply_to", "created_at",
        ]
        read_only_fields = ["id", "author_name", "created_at"]


class ClinicalBaselineSerializer(serializers.ModelSerializer[ClinicalBaseline]):
    recorded_by_name = serializers.CharField(source="recorded_by.display_name", read_only=True)

    class Meta:
        model = ClinicalBaseline
        fields = [
            "id", "diagnoses", "assessment_scores", "visual_limits", "motor_limits",
            "ideal_session_minutes", "max_difficulty_level", "recorded_by_name", "updated_at",
        ]
        read_only_fields = ["id", "recorded_by_name", "updated_at"]


class ExerciseAssignmentSerializer(serializers.ModelSerializer[ExerciseAssignment]):
    game_name = serializers.CharField(source="game.name", read_only=True)
    completion = serializers.SerializerMethodField()

    class Meta:
        model = ExerciseAssignment
        fields = [
            "id", "game", "game_name", "start_level", "target_minutes", "times_per_week",
            "time_slot", "review_date", "active", "notes", "completion",
        ]
        read_only_fields = ["id", "game_name", "completion"]

    def get_completion(self, obj: ExerciseAssignment) -> dict[str, int]:
        from datetime import timedelta

        from django.utils import timezone

        start = timezone.localdate() - timedelta(days=timezone.localdate().weekday())
        return {
            "planned_this_week": obj.times_per_week,
            "done_this_week": obj.patient.game_sessions.filter(
                game=obj.game, guest_mode=False, ended_at__date__gte=start,
                metrics__completed=True,
            ).count(),
        }
