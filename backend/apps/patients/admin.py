from django.contrib import admin
from django.db.models import QuerySet
from django.forms import BaseModelFormSet, ModelForm
from django.http import HttpRequest
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import audit
from apps.patients.models import CareAssignment, DoctorAssignment, PatientProfile


class CareAssignmentInline(admin.TabularInline[CareAssignment, PatientProfile]):
    model = CareAssignment
    extra = 0
    readonly_fields = ("assigned_by", "assigned_at")


class DoctorAssignmentInline(admin.TabularInline[DoctorAssignment, PatientProfile]):
    model = DoctorAssignment
    extra = 0
    readonly_fields = ("assigned_by", "assigned_at")


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin[PatientProfile]):
    list_display = ("user", "region")
    inlines = (CareAssignmentInline, DoctorAssignmentInline)
    actions = ("transfer_doctor",)

    @admin.action(description="Transfer doctor using submitted doctor_id")
    def transfer_doctor(self, request: HttpRequest, queryset: QuerySet[PatientProfile]) -> None:
        doctor_id = request.POST.get("doctor_id", "")
        doctor = User.objects.filter(id=doctor_id, role=User.Role.DOCTOR).first()
        if doctor is None:
            self.message_user(request, "Submit a valid doctor_id.", level="error")
            return
        for patient in queryset:
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
