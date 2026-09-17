from rest_framework import serializers

from apps.content.models import ContentItem


class ContentItemSerializer(serializers.ModelSerializer[ContentItem]):
    image_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = ContentItem
        fields = ("id", "kind", "title", "title_translations", "tags", "image_url", "audio_url")

    def get_image_url(self, obj: ContentItem) -> str | None:
        return obj.image.url if obj.image else None

    def get_audio_url(self, obj: ContentItem) -> str | None:
        return obj.audio.url if obj.audio else None
