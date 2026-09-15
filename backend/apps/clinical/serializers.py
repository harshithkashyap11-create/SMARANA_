from rest_framework import serializers

from apps.clinical.models import ClinicalNote


class ClinicalNoteSerializer(serializers.ModelSerializer[ClinicalNote]):
    author_name = serializers.CharField(source="author.display_name", read_only=True)

    class Meta:
        model = ClinicalNote
        fields = ["id", "author_name", "category", "visibility", "text", "created_at"]
        read_only_fields = ["id", "author_name", "created_at"]
