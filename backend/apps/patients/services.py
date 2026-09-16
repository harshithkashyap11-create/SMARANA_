"""Business operations for patient profiles, family, and consent."""

from datetime import date
from typing import Any, cast

from django.db import transaction

from apps.accounts.models import User
from apps.audit.services import audit
from apps.patients.models import ConsentSettings, FamilyMember, PatientProfile


def _audit_value(value: Any) -> Any:
    if isinstance(value, date):
        return value.isoformat()
    if hasattr(value, "name") and hasattr(value, "storage"):
        return value.name
    if hasattr(value, "pk"):
        return str(value.pk)
    return value


def _changes(instance: Any, fields: dict[str, Any]) -> dict[str, list[Any]]:
    return {
        name: [_audit_value(getattr(instance, name)), _audit_value(value)]
        for name, value in fields.items()
        if getattr(instance, name) != value
    }


def update_profile(
    *, actor: User, patient: PatientProfile, fields: dict[str, Any]
) -> PatientProfile:
    with transaction.atomic():
        user_fields = fields.pop("user", {})
        changes = _changes(patient, fields)
        for name, value in fields.items():
            setattr(patient, name, value)
        if changes:
            patient.save(update_fields=[*changes, "updated_at"])
            audit(actor, "update", patient, patient=patient, changes=changes)
        if user_fields:
            for name, value in user_fields.items():
                setattr(patient.user, name, value)
            patient.user.save(update_fields=list(user_fields))
    return patient


def create_family_member(
    *, actor: User, patient: PatientProfile, fields: dict[str, Any]
) -> FamilyMember:
    with transaction.atomic():
        member = cast(FamilyMember, FamilyMember.objects.create(patient=patient, **fields))
        changes = {name: [None, _audit_value(value)] for name, value in fields.items()}
        audit(actor, "create", member, patient=patient, changes=changes)
    return member


def update_family_member(
    *, actor: User, member: FamilyMember, fields: dict[str, Any]
) -> FamilyMember:
    with transaction.atomic():
        changes = _changes(member, fields)
        for name, value in fields.items():
            setattr(member, name, value)
        if changes:
            member.save(update_fields=[*changes, "updated_at"])
            audit(actor, "update", member, patient=member.patient, changes=changes)
    return member


def delete_family_member(*, actor: User, member: FamilyMember) -> None:
    with transaction.atomic():
        member.delete()
        audit(
            actor,
            "delete",
            member,
            patient=member.patient,
            changes={"deleted_at": [None, member.deleted_at.isoformat()]},
        )


def update_consent(
    *, actor: User, consent: ConsentSettings, fields: dict[str, Any]
) -> ConsentSettings:
    with transaction.atomic():
        fields = {**fields, "updated_by": actor}
        changes = _changes(consent, fields)
        for name, value in fields.items():
            setattr(consent, name, value)
        if changes:
            consent.save(update_fields=[*changes, "updated_at"])
            audit(actor, "update", consent, patient=consent.patient, changes=changes)
    return consent
