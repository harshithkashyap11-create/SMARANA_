"""Reusable API permission classes."""

from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.accounts.models import User


class IsRole(BasePermission):
    """Allow authenticated users whose role is in the configured set."""

    def __init__(self, *roles: str) -> None:
        self.roles = frozenset(roles)

    def __call__(self) -> "IsRole":
        return self

    def has_permission(self, request: Request, view: APIView) -> bool:
        del view
        user = request.user
        return isinstance(user, User) and user.is_authenticated and user.role in self.roles


def authenticated_user(request: Request) -> User:
    """Narrow DRF's anonymous-or-user principal after authentication permissions."""
    user = request.user
    if not isinstance(user, User) or not user.is_authenticated:
        raise NotAuthenticated()
    return user


def role_permission(*roles: str) -> type[BasePermission]:
    class ConfiguredRole(IsRole):
        def __init__(self) -> None:
            super().__init__(*roles)

    return ConfiguredRole
