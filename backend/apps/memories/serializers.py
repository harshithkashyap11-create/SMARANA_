from rest_framework import serializers

from apps.memories.models import Memory, MemoryMedia, MemoryQuizAttempt
from apps.patients.media import media_url


class MemoryMediaSerializer(serializers.ModelSerializer[MemoryMedia]):
    url = serializers.SerializerMethodField()

    class Meta:
        model = MemoryMedia
        fields = ["id", "kind", "url", "caption", "order"]

    def get_url(self, obj: MemoryMedia) -> str | None:
        return media_url(obj.file)


class MemorySerializer(serializers.ModelSerializer[Memory]):
    media = MemoryMediaSerializer(many=True, read_only=True)
    people = serializers.SerializerMethodField()

    class Meta:
        model = Memory
        fields = [
            "id",
            "title",
            "occasion",
            "occurred_on",
            "place",
            "summary",
            "visibility",
            "people",
            "media",
        ]

    def get_people(self, obj: Memory) -> list[dict[str, str]]:
        return [
            {
                "id": str(person.id),
                "name": person.name,
                "relationship": person.relationship_label or person.get_relationship_display(),
            }
            for person in obj.people.all()
        ]


class AttemptInputSerializer(serializers.Serializer[dict[str, object]]):
    id = serializers.UUIDField(required=False)
    memory_id = serializers.UUIDField(required=False, allow_null=True)
    question_type = serializers.ChoiceField(choices=MemoryQuizAttempt.QuestionType.choices)
    expected = serializers.CharField(max_length=255)
    given = serializers.CharField(max_length=255)
    correct = serializers.BooleanField()
    attempted_at = serializers.DateTimeField()
    response_ms = serializers.IntegerField(min_value=0)
    device_updated_at = serializers.DateTimeField()
    idempotency_key = serializers.CharField(max_length=128)
