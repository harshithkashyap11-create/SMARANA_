from rest_framework import serializers

from apps.alerts.models import Alert, CheckInResponse, NotificationPreference


class AlertSerializer(serializers.ModelSerializer[Alert]):
    forwarded_to_name = serializers.CharField(source="forwarded_to.display_name", read_only=True)
    can_forward = serializers.SerializerMethodField()

    def get_can_forward(self, obj: Alert) -> bool:
        return obj.patient.doctor_assignments.filter(active=True).exists()

    class Meta:
        model = Alert
        fields = [
            "id",
            "rule_key",
            "severity",
            "title",
            "explanation",
            "evidence",
            "notified",
            "triggered_at",
            "status",
            "acknowledged_at",
            "forwarded_to",
            "forwarded_to_name",
            "notes",
            "can_forward",
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    enabled = serializers.BooleanField(default=True)

    class Meta:
        model = NotificationPreference
        fields = ["id", "channel", "rule_key", "enabled"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        channel = attrs.get("channel", getattr(self.instance, "channel", None))
        enabled = attrs.get("enabled", getattr(self.instance, "enabled", True))
        if channel in {"push", "sms"} and enabled:
            raise serializers.ValidationError("Push and SMS are not available yet.")
        if self.instance is not None:
            duplicate = NotificationPreference.objects.filter(
                user=self.instance.user,
                channel=channel,
                rule_key=attrs.get("rule_key", self.instance.rule_key),
            )
            if duplicate.exclude(id=self.instance.id).exists():
                raise serializers.ValidationError("A preference for this channel and rule exists.")
        return attrs


class CheckInResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = CheckInResponse
        fields = ["id", "checkin", "answer", "responded_at", "device_updated_at"]
        extra_kwargs = {"id": {"read_only": False, "required": True}, "checkin": {"validators": []}}
        validators = []
