"""Reject professional credentials immediately when approval is revoked."""

from typing import cast

from drf_spectacular.contrib.rest_framework_simplejwt import SimpleJWTScheme
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import Token

from apps.accounts.models import User


class ApprovedJWTAuthentication(JWTAuthentication):
    # SimpleJWT uses an unconstrained return TypeVar; AUTH_USER_MODEL fixes the model to User.
    def get_user(self, validated_token: Token) -> User:  # type: ignore[override]
        user = cast(User, super().get_user(validated_token))
        if user.role in {User.Role.CAREGIVER, User.Role.DOCTOR} and not user.is_approved:
            raise AuthenticationFailed("Account approval is required.")
        return user


# drf-spectacular extension registration has an untyped third-party __init_subclass__.
class ApprovedJWTScheme(SimpleJWTScheme):  # type: ignore[no-untyped-call]
    target_class = "apps.accounts.authentication.ApprovedJWTAuthentication"
    priority = 1
