from rest_framework import serializers

from apps.alerts.models import Alert


class AlertSerializer(serializers.ModelSerializer[Alert]):
    forwarded_to_name = serializers.CharField(source="forwarded_to.display_name", read_only=True)

    class Meta:
        model = Alert
        fields = [
            "id",
            "rule_key",
            "severity",
            "title",
            "explanation",
            "evidence",
            "triggered_at",
            "status",
            "acknowledged_at",
            "forwarded_to",
            "forwarded_to_name",
            "notes",
        ]
