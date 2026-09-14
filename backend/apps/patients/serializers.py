"""Read-only patient API shapes."""

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.patients.models import PatientProfile


class PatientCardSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.display_name", read_only=True)
    age = serializers.SerializerMethodField()
    language = serializers.SerializerMethodField()
    primary_caregiver_name = serializers.CharField(read_only=True, allow_null=True)
    last_active_at = serializers.DateTimeField(read_only=True, allow_null=True)
    open_alert_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = PatientProfile
        fields = (
            "id",
            "name",
            "age",
            "language",
            "primary_caregiver_name",
            "last_active_at",
            "open_alert_count",
        )
        read_only_fields = fields

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_age(self, obj: PatientProfile) -> None:
        del obj
        return None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_language(self, obj: PatientProfile) -> None:
        del obj
        return None
