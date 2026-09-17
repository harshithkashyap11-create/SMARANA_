from typing import Any

from django import forms
from django.contrib import admin
from django.contrib.admin.helpers import ActionForm
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import QuerySet
from django.forms import BaseModelFormSet, ModelForm
from django.http import HttpRequest
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import audit
from apps.patients.models import CareAssignment, DoctorAssignment, PatientProfile


class AssignmentForm(forms.ModelForm[Any]):
    def clean(self) -> dict[str, Any]:
        data = super().clean() or {}
        if not data.get("active", True) and not data.get("reason", "").strip():
            self.add_error("reason", "Give a reason for ending this assignment.")
        return data


class TransferDoctorForm(ActionForm):
    doctor_id = forms.ModelChoiceField(
        label="Transfer to doctor",
        queryset=User.objects.filter(role=User.Role.DOCTOR, is_active=True, is_approved=True),
        required=False,
    )


class CareAssignmentInline(admin.TabularInline[CareAssignment, PatientProfile]):
    model = CareAssignment
    form = AssignmentForm
    can_delete = False
    extra = 0
    readonly_fields = ("assigned_by", "assigned_at")


class DoctorAssignmentInline(admin.TabularInline[DoctorAssignment, PatientProfile]):
    model = DoctorAssignment
    form = AssignmentForm
    can_delete = False
    extra = 0
    readonly_fields = ("assigned_by", "assigned_at")


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin[PatientProfile]):
    list_display = ("user", "region")
    inlines = (CareAssignmentInline, DoctorAssignmentInline)
    actions = ("transfer_doctor",)
    action_form = TransferDoctorForm

    @admin.action(description="Transfer to the selected doctor")
    @transaction.atomic
    def transfer_doctor(self, request: HttpRequest, queryset: QuerySet[PatientProfile]) -> None:
        doctor_id = request.POST.get("doctor_id", "")
        try:
            doctor = User.objects.filter(
                id=doctor_id, role=User.Role.DOCTOR, is_active=True, is_approved=True
            ).first()
        except (ValueError, ValidationError):
            doctor = None
        if doctor is None:
            self.message_user(request, "Submit a valid doctor_id.", level="error")
            return
        for patient in queryset:
            patient = PatientProfile.objects.select_for_update().get(pk=patient.pk)
            for assignment in patient.doctor_assignments.filter(active=True):
                assignment.active = False
                assignment.ended_at = timezone.now()
                assignment.reason = "Transferred by administrator"
                assignment.save(update_fields=["active", "ended_at", "reason", "updated_at"])
                audit(request.user, "unassign", assignment, patient=patient)
            assignment = DoctorAssignment.objects.create(
                patient=patient,
                doctor=doctor,
                assigned_by=request.user if isinstance(request.user, User) else None,
                reason="Transferred by administrator",
            )
            audit(request.user, "assign", assignment, patient=patient)
        self.message_user(request, "Doctor assignment transferred.", level="success")

    def save_formset(
        self,
        request: HttpRequest,
        form: ModelForm[PatientProfile],
        formset: BaseModelFormSet[CareAssignment, ModelForm[CareAssignment]]
        | BaseModelFormSet[DoctorAssignment, ModelForm[DoctorAssignment]],
        change: bool,
    ) -> None:
        instances = formset.save(commit=False)
        for instance in instances:
            is_new = instance._state.adding
            if is_new:
                instance.assigned_by = request.user if isinstance(request.user, User) else None
            if not instance.active and instance.ended_at is None:
                if not instance.reason.strip():
                    from django.core.exceptions import ValidationError

                    raise ValidationError("A reason is required when ending an assignment.")
                instance.ended_at = timezone.now()
            instance.save()
            audit(
                request.user,
                "assign" if is_new else "unassign" if not instance.active else "assign",
                instance,
                patient=form.instance,
                changes={"reason": instance.reason, "active": instance.active},
            )
        formset.save_m2m()
