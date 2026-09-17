"""Notification channels for urgent care-team alerts."""

import logging
from dataclasses import dataclass
from typing import Protocol

from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.alerts.models import Alert, NotificationPreference


class Channel(Protocol):
    @property
    def name(self) -> str: ...

    def send(self, alert: Alert, recipient: User) -> bool: ...


@dataclass(frozen=True)
class InApp:
    name: str = "in_app"

    def send(self, alert: Alert, recipient: User) -> bool:
        return True


@dataclass(frozen=True)
class Email:
    name: str = "email"

    def send(self, alert: Alert, recipient: User) -> bool:
        if not recipient.email:
            return False
        send_mail(
            subject=f"Smārana alert: {alert.title}",
            message=f"{alert.explanation}\n\nPlease open Smārana to review this alert.",
            from_email=None,
            recipient_list=[recipient.email],
        )
        return True


@transaction.atomic
def notify_alert(alert: Alert) -> Alert:
    original = alert
    alert = Alert.objects.select_for_update().get(pk=alert.pk)
    recipients = [
        assignment.caregiver
        for assignment in alert.patient.care_assignments.filter(active=True).select_related(
            "caregiver"
        )
    ]
    channels: list[Channel] = [InApp()]
    if alert.severity == Alert.Severity.HIGH or alert.rule_key == Alert.RuleKey.SOS:
        channels.append(Email())
    sent = list(alert.notified)
    incident = alert.evidence.get("sos_event_id") if alert.rule_key == Alert.RuleKey.SOS else None
    already = {(row.get("user_id"), row.get("channel"), row.get("incident_id")) for row in sent}
    for recipient in recipients:
        for channel in channels:
            preference = NotificationPreference.objects.filter(
                user=recipient, channel=channel.name, rule_key=alert.rule_key
            ).first()
            if preference is not None and not preference.enabled:
                continue
            key = (str(recipient.id), channel.name, incident)
            if key in already:
                continue
            try:
                delivered = channel.send(alert, recipient)
            except Exception:
                logging.getLogger(__name__).exception(
                    "Alert delivery failed channel=%s", channel.name
                )
                continue
            if not delivered:
                continue
            sent.append(
                {
                    "user_id": str(recipient.id),
                    "channel": channel.name,
                    "incident_id": incident,
                    "at": timezone.now().isoformat(),
                }
            )
            already.add(key)
    alert.notified = sent
    alert.save(update_fields=["notified", "updated_at"])
    original.notified = sent
    return alert
