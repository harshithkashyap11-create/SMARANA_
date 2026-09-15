from rest_framework import serializers

from apps.games.models import GameDefinition


class GameDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameDefinition
        fields = ["id", "key", "name", "cognitive_domains", "min_level", "max_level", "is_regional"]


class GameSessionInputSerializer(serializers.Serializer):
    game_key = serializers.SlugField()
    seed = serializers.CharField(max_length=64)
    level = serializers.IntegerField(min_value=1, max_value=10)
    metrics = serializers.JSONField()
    challenge_mode = serializers.BooleanField(default=False)
    guest_mode = serializers.BooleanField(default=False)
    started_at = serializers.DateTimeField()
    ended_at = serializers.DateTimeField()

    def validate_game_key(self, value: str) -> str:
        if not GameDefinition.objects.filter(key=value, active=True).exists():
            raise serializers.ValidationError("Game is unavailable.")
        return value

    def validate_metrics(self, value: object) -> dict:
        if not isinstance(value, dict):
            raise serializers.ValidationError("Expected an object.")
        return value
