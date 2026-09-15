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


class MemoryCreateSerializer(serializers.Serializer[dict[str, object]]):
    title = serializers.CharField(max_length=255)
    occasion = serializers.ChoiceField(choices=Memory.Occasion.choices)
    occurred_on = serializers.DateField(required=False, allow_null=True)
    place = serializers.CharField(max_length=255, required=False, allow_blank=True)
    summary = serializers.CharField()
    visibility = serializers.ChoiceField(choices=Memory.Visibility.choices)
    people = serializers.ListField(child=serializers.UUIDField(), required=False)


class MemoryMediaInputSerializer(serializers.Serializer[dict[str, object]]):
    file = serializers.ImageField()
    caption = serializers.CharField(max_length=255, required=False, allow_blank=True)
    order = serializers.IntegerField(min_value=0, max_value=32767, required=False)

    def validate_file(self, value: object) -> object:
        content_type = getattr(value, "content_type", "")
        size = getattr(value, "size", 0)
        if not isinstance(content_type, str) or not content_type.startswith("image/"):
            raise serializers.ValidationError("Please choose an image file.")
        if not isinstance(size, int) or size > 8 * 1024 * 1024:
            raise serializers.ValidationError("Each image must be 8 MB or smaller.")
        return value


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
