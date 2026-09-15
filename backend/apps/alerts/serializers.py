from rest_framework import serializers

from apps.alerts.models import Alert


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
