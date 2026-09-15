from django.contrib import admin

from apps.games.models import DifficultyChange, DifficultyState, GameDefinition, GameSession


@admin.register(GameDefinition)
class GameDefinitionAdmin(admin.ModelAdmin):
    list_display = ("name", "key", "active", "max_level", "is_regional", "regions")
    list_editable = ("active", "max_level")
    list_filter = ("active", "is_regional")


admin.site.register(GameSession)


@admin.register(DifficultyState)
class DifficultyStateAdmin(admin.ModelAdmin):
    readonly_fields = (
        "patient", "game", "level", "window", "locked_by_doctor", "locked_by_name",
        "cap_level",
    )

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False


admin.site.register(DifficultyChange)
