"""Password-authenticated staff administration, restricted to the Admin role."""

from django.contrib.admin import AdminSite
from django.http import HttpRequest

from apps.accounts.models import User


class SmaranaAdminSite(AdminSite):
    site_header = "Smārana administration"

    def has_permission(self, request: HttpRequest) -> bool:
        user = request.user
        return (
            isinstance(user, User)
            and user.is_active
            and user.is_staff
            and user.role == User.Role.ADMIN
        )
