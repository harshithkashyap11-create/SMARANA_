from typing import Any

from django.db import transaction
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.audit.services import audit
from apps.clinical.models import ClinicalNote
from apps.patients.models import PatientProfile


@transaction.atomic
def create_note(*, patient: PatientProfile, actor: User, data: dict[str, Any]) -> ClinicalNote:
    if (
        actor.role == User.Role.CAREGIVER
        and data.get("category") != ClinicalNote.Category.CAREGIVER_FEEDBACK
    ):
        raise ValidationError({"category": "Caregivers can add caregiver feedback only."})
    if actor.role == User.Role.CAREGIVER:
        data["visibility"] = ClinicalNote.Visibility.CARE_TEAM
    note = ClinicalNote.objects.create(patient=patient, author=actor, **data)
    audit(
        actor, "clinical_note.created", note, patient=patient, changes={"category": note.category}
    )
    return note
