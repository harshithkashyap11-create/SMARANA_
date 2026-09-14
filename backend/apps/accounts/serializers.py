"""Request and response shapes for account endpoints."""

from rest_framework import serializers

from apps.accounts.models import User
from apps.patients.models import PatientProfile


class ProfessionalLoginSerializer(serializers.Serializer):
    email_or_phone = serializers.CharField(max_length=254)
    password = serializers.CharField(trim_whitespace=False, write_only=True)
    device_id = serializers.CharField(max_length=255)


class PatientLoginSerializer(serializers.Serializer):
    login_id = serializers.CharField(max_length=32)
    pin = serializers.RegexField(r"^\d{4}$", write_only=True)
    device_id = serializers.CharField(max_length=255)


class PatientPinResetSerializer(serializers.Serializer):
    patient_id = serializers.UUIDField()
    new_pin = serializers.RegexField(r"^\d{4}$", write_only=True)


class LockedResponseSerializer(serializers.Serializer):
    detail = serializers.CharField(read_only=True)
    code = serializers.CharField(read_only=True)
    retry_after_seconds = serializers.IntegerField(read_only=True)


class RefreshSerializer(serializers.Serializer):
    refresh = serializers.CharField(write_only=True)


class LogoutSerializer(RefreshSerializer):
    pass


class UserSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "display_name", "email", "phone", "role")
        read_only_fields = fields


class PreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("theme", "font_scale", "language")


class PatientSummarySerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="user.display_name", read_only=True)

    class Meta:
        model = PatientProfile
        fields = ("id", "name")
        read_only_fields = fields


class RotatedTokenResponseSerializer(serializers.Serializer):
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)


class LoginResponseSerializer(RotatedTokenResponseSerializer):
    user = UserSummarySerializer(read_only=True)


class AssignmentSummarySerializer(serializers.Serializer):
    patients = PatientSummarySerializer(many=True, read_only=True)


class MeSerializer(serializers.Serializer):
    user = UserSummarySerializer(read_only=True)
    role = serializers.CharField(read_only=True)
    preferences = PreferenceSerializer(read_only=True)
    assignments = AssignmentSummarySerializer(read_only=True)
