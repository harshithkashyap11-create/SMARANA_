"""Reusable API permission classes."""

from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView


class IsRole(BasePermission):
    """Allow authenticated users whose role is in the configured set."""

    def __init__(self, *roles: str) -> None:
        self.roles = frozenset(roles)

    def __call__(self) -> "IsRole":
        return self

    def has_permission(self, request: Request, view: APIView) -> bool:
        del view
        user: Any = request.user
        return bool(user and user.is_authenticated and user.role in self.roles)
