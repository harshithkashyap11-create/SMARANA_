from django.contrib import admin
from django.db.models import QuerySet
from django.http import HttpRequest

from apps.audit.models import AuditEvent


@admin.register(AuditEvent)
class AuditEventAdmin(admin.ModelAdmin[AuditEvent]):
    actions = ("export_selected",)
    list_display = ("created_at", "actor", "actor_role", "action", "target_model", "patient")
    list_filter = ("actor", "action", "patient", "created_at")
    search_fields = ("actor__username", "actor__display_name", "target_model", "target_id")
    readonly_fields = (
        "id",
        "actor",
        "actor_role",
        "action",
        "target_model",
        "target_id",
        "patient",
        "changes",
        "ip",
        "user_agent",
        "created_at",
    )

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: AuditEvent | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: AuditEvent | None = None) -> bool:
        return False

    @admin.action(description="Export selected audit rows")
    def export_selected(self, request: HttpRequest, queryset: QuerySet[AuditEvent]) -> None:
        from apps.audit.services import audit

        audit(
            request.user,
            "export",
            AuditEvent,
            changes={"row_ids": [str(value) for value in queryset.values_list("id", flat=True)]},
        )
