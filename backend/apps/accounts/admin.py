"""Django Admin configuration for the custom user."""

from typing import Any

from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.db.models import QuerySet
from django.http import HttpRequest

from apps.alerts.services import raise_alert
from apps.audit.services import audit

from .models import DeviceSession, DoctorProfile, User


class DoctorProfileInline(admin.StackedInline[DoctorProfile, User]):
    model = DoctorProfile
    extra = 0


@admin.register(User)
class SmaranaUserAdmin(UserAdmin[User]):
    inlines = (DoctorProfileInline,)
    actions = (
        "approve_selected",
        "deactivate_selected",
        "force_logout",
        "lock_account",
        "request_pin_reset",
    )
    fieldsets = (
        (None, {"fields": ("username", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "email")}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
        (
            "Smārana",
            {
                "fields": (
                    "role",
                    "display_name",
                    "theme",
                    "font_scale",
                    "language",
                    "is_approved",
                    "phone",
                )
            },
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Smārana",
            {
                "fields": (
                    "role",
                    "display_name",
                    "theme",
                    "font_scale",
                    "language",
                    "is_approved",
                    "phone",
                )
            },
        ),
    )
    list_display = ("username", "display_name", "role", "is_approved", "is_staff")
    list_filter = (*UserAdmin.list_filter, "role", "is_approved", "theme")
    search_fields = ("username", "display_name", "email", "phone")

    def get_form(
        self,
        request: HttpRequest,
        obj: User | None = None,
        change: bool = False,
        **kwargs: Any,
    ) -> type[forms.ModelForm[User]]:
        form = super().get_form(request, obj, change=change, **kwargs)
        permissions = form.base_fields.get("user_permissions")
        if (
            isinstance(permissions, forms.ModelMultipleChoiceField)
            and permissions.queryset is not None
        ):
            permissions.queryset = permissions.queryset.exclude(content_type__app_label="otp_totp")
        return form

    @admin.action(description="Approve selected")
    def approve_selected(self, request: HttpRequest, queryset: QuerySet[User]) -> None:
        for user in queryset.filter(role__in=[User.Role.DOCTOR, User.Role.CAREGIVER]):
            user.is_approved = True
            user.save(update_fields=["is_approved"])
            if user.role == User.Role.DOCTOR:
                DoctorProfile.objects.get_or_create(user=user)
            audit(request.user, "approve", user)

    @admin.action(description="Deactivate selected")
    def deactivate_selected(self, request: HttpRequest, queryset: QuerySet[User]) -> None:
        for user in queryset:
            user.is_active = False
            user.save(update_fields=["is_active"])
            audit(request.user, "deactivate", user)

    @admin.action(description="Force logout")
    def force_logout(self, request: HttpRequest, queryset: QuerySet[User]) -> None:
        from rest_framework_simplejwt.token_blacklist.models import (
            BlacklistedToken,
            OutstandingToken,
        )

        for user in queryset:
            for token in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=token)
            DeviceSession.objects.filter(user=user).delete()
            audit(request.user, "force_logout", user)

    @admin.action(description="Lock account")
    def lock_account(self, request: HttpRequest, queryset: QuerySet[User]) -> None:
        self.deactivate_selected(request, queryset)

    @admin.action(description="Send PIN reset request")
    def request_pin_reset(self, request: HttpRequest, queryset: QuerySet[User]) -> None:
        for user in queryset.filter(role=User.Role.PATIENT).select_related("patient_profile"):
            patient = user.patient_profile
            raise_alert(
                patient=patient,
                rule_key="pin_reset_request",
                severity="info",
                title="PIN reset requested",
                explanation="An administrator requested help resetting the patient PIN.",
            )
            audit(request.user, "request_pin_reset", user, patient=patient)
