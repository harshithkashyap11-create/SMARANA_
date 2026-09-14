"""Authentication and account mutation services."""

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, cast

from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.db.models import Q
from django.db.models.query import QuerySet
from django.utils import timezone
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import DeviceSession, User
from apps.patients.models import PatientProfile
from apps.shared.exceptions import UserFacingError

DUMMY_PASSWORD_HASH = make_password("credential-enumeration-dummy")


@dataclass(frozen=True)
class IssuedTokens:
    access: str
    refresh: str


def assigned_patients(*, user: User) -> QuerySet[PatientProfile]:
    """Return the active patient summary scope for a professional user."""

    if user.role == User.Role.CAREGIVER:
        return PatientProfile.objects.filter(
            care_assignments__caregiver=user,
            care_assignments__active=True,
        ).distinct()
    if user.role == User.Role.DOCTOR:
        return PatientProfile.objects.filter(
            doctor_assignments__doctor=user,
            doctor_assignments__active=True,
        ).distinct()
    return PatientProfile.objects.none()


def authenticate_professional(*, email_or_phone: str, password: str) -> User:
    """Verify a non-patient account without disclosing whether it exists."""

    identifier = email_or_phone.strip()
    user = (
        User.objects.filter(Q(email__iexact=identifier) | Q(phone=identifier))
        .exclude(role=User.Role.PATIENT)
        .first()
    )
    encoded_password = user.password if user is not None else DUMMY_PASSWORD_HASH
    password_matches = check_password(password, encoded_password)

    if user is None or not password_matches:
        raise UserFacingError("credentials_not_verified", status_code=401)
    if not user.is_active:
        raise UserFacingError("credentials_not_verified", status_code=401)
    if user.role in {User.Role.CAREGIVER, User.Role.DOCTOR} and not user.is_approved:
        raise UserFacingError("awaiting_approval", status_code=403)
    return user


@transaction.atomic
def issue_tokens(*, user: User, device_id: str) -> IssuedTokens:
    """Issue one rotating refresh token and bind it to the supplied device."""

    refresh = RefreshToken.for_user(user)
    DeviceSession.objects.update_or_create(
        user=user,
        device_id=device_id,
        defaults={
            "refresh_token_jti": str(refresh["jti"]),
            "last_seen_at": timezone.now(),
        },
    )
    return IssuedTokens(access=str(refresh.access_token), refresh=str(refresh))


@transaction.atomic
def refresh_session(*, refresh_token: str) -> IssuedTokens:
    """Rotate a valid refresh token and advance its bound device session."""

    old_refresh = RefreshToken(cast(Any, refresh_token))
    old_jti = str(old_refresh["jti"])
    try:
        session = DeviceSession.objects.select_for_update().get(refresh_token_jti=old_jti)
    except DeviceSession.DoesNotExist as exc:
        raise InvalidToken("Token is not bound to an active device session") from exc

    serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
    serializer.is_valid(raise_exception=True)
    tokens: dict[str, Any] = serializer.validated_data
    rotated_refresh = tokens.get("refresh")
    if not rotated_refresh:
        raise TokenError("Refresh rotation did not return a refresh token")

    new_refresh = RefreshToken(cast(Any, str(rotated_refresh)))
    session.refresh_token_jti = str(new_refresh["jti"])
    session.last_seen_at = timezone.now()
    session.save(update_fields=["refresh_token_jti", "last_seen_at", "updated_at"])
    return IssuedTokens(access=str(tokens["access"]), refresh=str(rotated_refresh))


@transaction.atomic
def logout_session(*, user: User, refresh_token: str) -> None:
    """Blacklist the caller's refresh token and remove its device binding."""

    refresh = RefreshToken(cast(Any, refresh_token))
    if str(refresh["user_id"]) != str(user.pk):
        raise InvalidToken("Token does not belong to the authenticated user")

    refresh.blacklist()
    DeviceSession.objects.filter(
        user=user,
        refresh_token_jti=str(refresh["jti"]),
    ).delete()


def update_preferences(
    *,
    user: User,
    theme: str | None = None,
    font_scale: Decimal | None = None,
) -> User:
    """Update the preference fields currently owned by the User model."""

    update_fields: list[str] = []
    if theme is not None:
        user.theme = theme
        update_fields.append("theme")
    if font_scale is not None:
        user.font_scale = font_scale
        update_fields.append("font_scale")
    if not update_fields:
        return user

    user.full_clean(exclude=["password"])
    user.save(update_fields=update_fields)
    return user
