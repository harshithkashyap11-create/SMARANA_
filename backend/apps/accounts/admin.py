"""Django Admin configuration for the custom user."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class SmaranaUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "Smārana",
            {"fields": ("role", "display_name", "theme", "font_scale", "is_approved", "phone")},
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Smārana",
            {"fields": ("role", "display_name", "theme", "font_scale", "is_approved", "phone")},
        ),
    )
    list_display = ("username", "display_name", "role", "is_approved", "is_staff")
    list_filter = UserAdmin.list_filter + ("role", "is_approved", "theme")
    search_fields = ("username", "display_name", "email", "phone")
