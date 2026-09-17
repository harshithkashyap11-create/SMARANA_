"""Authentication and account mutation services."""

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from typing import Any, cast

from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.db.models import Q
from django.db.models.query import QuerySet
from django.utils import timezone
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.models import DeviceSession, PatientCredential, User
from apps.patients.models import PatientProfile
from apps.shared.exceptions import UserFacingError

DUMMY_PASSWORD_HASH = make_password("credential-enumeration-dummy")
DUMMY_PIN_HASH = make_password("0000", hasher="argon2")
PIN_FAILURE_LIMIT = 5
PIN_LOCK_DURATION = timedelta(minutes=15)


@dataclass(frozen=True)
class IssuedTokens:
    access: str
    refresh: str


@dataclass(frozen=True)
class PinLocked(Exception):
    retry_after_seconds: int


class PatientRefreshToken(RefreshToken):
    lifetime = timedelta(days=30)


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


def set_pin(*, credential: PatientCredential, raw_pin: str) -> PatientCredential:
    """Hash and store a four-digit patient PIN using Argon2."""

    if len(raw_pin) != 4 or not raw_pin.isdecimal():
        raise ValueError("PIN must contain exactly four digits")
    credential.pin_hash = make_password(raw_pin, hasher="argon2")
    credential.failed_attempts = 0
    credential.locked_until = None
    credential.save(update_fields=["pin_hash", "failed_attempts", "locked_until", "updated_at"])
    return credential


def verify_pin(*, login_id: str, pin: str) -> User:
    """Verify a patient PIN, applying the failure lock and alert policy."""

    now = timezone.now()
    authenticated_user: User | None = None
    retry_after: int | None = None
    verification_failed = False

    with transaction.atomic():
        credential = (
            PatientCredential.objects.select_for_update()
            .select_related("user")
            .filter(login_id__iexact=login_id.strip())
            .first()
        )
        encoded_pin = credential.pin_hash if credential is not None else DUMMY_PIN_HASH
        pin_matches = check_password(pin, encoded_pin)
        if credential is None or not credential.user.is_active:
            verification_failed = True
        elif credential.locked_until and credential.locked_until > now:
            retry_after = max(1, int((credential.locked_until - now).total_seconds()))
        else:
            if credential.locked_until:
                credential.failed_attempts = 0
                credential.locked_until = None

            if pin_matches:
                credential.failed_attempts = 0
                credential.locked_until = None
                credential.save(update_fields=["failed_attempts", "locked_until", "updated_at"])
                authenticated_user = credential.user
            else:
                credential.failed_attempts += 1
                if credential.failed_attempts >= PIN_FAILURE_LIMIT:
                    credential.locked_until = now + PIN_LOCK_DURATION
                    retry_after = int(PIN_LOCK_DURATION.total_seconds())
                credential.save(update_fields=["failed_attempts", "locked_until", "updated_at"])
                if retry_after is not None:
                    from apps.alerts.services import raise_alert

                    raise_alert(
                        patient=credential.user.patient_profile,
                        rule_key="pin_lockout",
                        severity="attention",
                        title="Patient PIN locked",
                        explanation="Five unsuccessful PIN attempts triggered a temporary lock.",
                        evidence={"failed_attempts": credential.failed_attempts},
                    )
                else:
                    verification_failed = True

    if retry_after is not None:
        raise PinLocked(retry_after_seconds=retry_after)
    if verification_failed or authenticated_user is None:
        raise UserFacingError("pin_not_verified", status_code=401)
    return authenticated_user


@transaction.atomic
def reset_patient_pin(*, caregiver: User, patient_id: str, pin: str) -> PatientCredential:
    """Reset a PIN only through the patient's active primary caregiver assignment."""

    try:
        credential = PatientCredential.objects.select_for_update().get(
            user__patient_profile__id=patient_id,
            user__patient_profile__care_assignments__caregiver=caregiver,
            user__patient_profile__care_assignments__active=True,
            user__patient_profile__care_assignments__is_primary=True,
        )
    except PatientCredential.DoesNotExist as exc:
        raise UserFacingError("patient_not_found", status_code=404) from exc
    return set_pin(credential=credential, raw_pin=pin)


@transaction.atomic
def issue_tokens(*, user: User, device_id: str) -> IssuedTokens:
    """Issue one rotating refresh token and bind it to the supplied device."""

    token_class = PatientRefreshToken if user.role == User.Role.PATIENT else RefreshToken
    refresh = token_class.for_user(user)
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

    if not session.user.is_active or (
        session.user.role in {User.Role.CAREGIVER, User.Role.DOCTOR}
        and not session.user.is_approved
    ):
        raise InvalidToken("User account is inactive")

    old_refresh.blacklist()
    token_class = PatientRefreshToken if session.user.role == User.Role.PATIENT else RefreshToken
    new_refresh = token_class.for_user(session.user)
    session.refresh_token_jti = str(new_refresh["jti"])
    session.last_seen_at = timezone.now()
    session.save(update_fields=["refresh_token_jti", "last_seen_at", "updated_at"])
    return IssuedTokens(access=str(new_refresh.access_token), refresh=str(new_refresh))


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
    language: str | None = None,
) -> User:
    """Update the preference fields currently owned by the User model."""

    update_fields: list[str] = []
    if theme is not None:
        user.theme = theme
        update_fields.append("theme")
    if font_scale is not None:
        user.font_scale = font_scale
        update_fields.append("font_scale")
    if language is not None:
        user.language = language
        update_fields.append("language")
    if not update_fields:
        return user

    user.full_clean(exclude=["password"])
    user.save(update_fields=update_fields)
    return user
