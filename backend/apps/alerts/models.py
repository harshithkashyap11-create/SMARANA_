"""Care-team alerts raised from patient events."""

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.patients.models import PatientProfile
from apps.shared.models import OfflineCapable, TimeStamped, UUIDModel


class Alert(UUIDModel, TimeStamped):
    """A patient alert with a concise explanation and supporting evidence."""

    class RuleKey(models.TextChoices):
        NO_LOGIN_2D = "no_login_2d", "No login for two days"
        MISSED_MEDS_3_IN_7 = "missed_meds_3in7", "Three missed medicines in seven days"
        LEVEL_DROP_X3 = "level_drop_x3", "Three difficulty level drops"
        REACTION_TIME_WORSENING = "reaction_time_worsening", "Reaction time worsening"
        ENGAGEMENT_DROP = "engagement_drop", "Engagement drop"
        LOW_MOOD_3D = "low_mood_3d", "Low mood for three days"
        SOS = "sos", "SOS"
        PIN_LOCKOUT = "pin_lockout", "Patient PIN locked"
        DEVICE_OFFLINE_3D = "device_offline_3d", "Device offline for three days"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        ATTENTION = "attention", "Attention"
        HIGH = "high", "High"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        ACKNOWLEDGED = "acknowledged", "Acknowledged"
        FORWARDED = "forwarded", "Forwarded"
        DISMISSED = "dismissed", "Dismissed"

    patient = models.ForeignKey(
        PatientProfile,
        on_delete=models.CASCADE,
        related_name="alerts",
    )
    rule_key = models.CharField(max_length=32, choices=RuleKey.choices)
    severity = models.CharField(max_length=16, choices=Severity.choices)
    title = models.CharField(max_length=200)
    explanation = models.TextField()
    evidence = models.JSONField(default=dict, blank=True)
    triggered_at = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.OPEN)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="acknowledged_alerts",
        blank=True,
        null=True,
    )
    acknowledged_at = models.DateTimeField(blank=True, null=True)
    forwarded_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="forwarded_alerts",
        blank=True,
        null=True,
    )
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-triggered_at", "id"]
        indexes = [models.Index(fields=["patient", "status"], name="alert_patient_status_idx")]
        constraints = [
            models.UniqueConstraint(
                fields=["patient", "rule_key"],
                condition=Q(status="open"),
                name="unique_open_patient_rule_alert",
            )
        ]

    def __str__(self) -> str:
        return f"{self.patient}: {self.get_rule_key_display()}"


class SosEvent(OfflineCapable):
    """An emergency request made from the patient's device."""

    patient = models.ForeignKey(PatientProfile, on_delete=models.CASCADE, related_name="sos_events")
    triggered_at = models.DateTimeField(default=timezone.now)
    location_text = models.CharField(max_length=255, blank=True)
    notified = models.JSONField(default=list)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="acknowledged_sos_events",
        blank=True,
        null=True,
    )
    acknowledged_at = models.DateTimeField(blank=True, null=True)
    resolution_note = models.TextField(blank=True)

    class Meta:
        ordering = ["-triggered_at", "id"]
