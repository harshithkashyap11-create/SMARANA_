"""Service-layer helpers for append-only auditing."""

from typing import Any

from django.db.models import Model
from rest_framework.request import Request

from apps.audit.models import AuditEvent
from apps.patients.models import PatientProfile


def audit(
    actor: Any,
    action: str,
    obj: Model | type[Model],
    patient: PatientProfile | None = None,
    changes: dict[str, Any] | None = None,
    request: Request | None = None,
) -> AuditEvent:
    """Append one audit event without exposing request details to callers."""

    model = obj if isinstance(obj, type) else type(obj)
    target_id = getattr(obj, "pk", None) if not isinstance(obj, type) else None
    meta = request.META if request is not None else {}
    forwarded_for = meta.get("HTTP_X_FORWARDED_FOR", "")
    ip = forwarded_for.split(",")[0].strip() or meta.get("REMOTE_ADDR") or None
    return AuditEvent.objects.create(
        actor=actor if getattr(actor, "is_authenticated", False) else None,
        actor_role=getattr(actor, "role", "") if getattr(actor, "is_authenticated", False) else "",
        action=action,
        target_model=model._meta.label,
        target_id=target_id,
        patient=patient,
        changes=changes or {},
        ip=ip,
        user_agent=meta.get("HTTP_USER_AGENT", ""),
    )
