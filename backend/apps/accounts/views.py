"""Thin HTTP adapters for authentication and account preferences."""

from typing import Any

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

from apps.accounts.models import DoctorProfile, User
from apps.accounts.serializers import (
    LockedResponseSerializer,
    LoginResponseSerializer,
    LogoutSerializer,
    MeSerializer,
    PatientLoginSerializer,
    PatientPinResetSerializer,
    PatientSummarySerializer,
    PreferenceSerializer,
    ProfessionalLoginSerializer,
    RefreshSerializer,
    RotatedTokenResponseSerializer,
    UserSummarySerializer,
)
from apps.accounts.services import (
    PinLocked,
    assigned_patients,
    authenticate_professional,
    issue_tokens,
    logout_session,
    refresh_session,
    reset_patient_pin,
    update_preferences,
    verify_pin,
)
from apps.accounts.throttles import LoginThrottle
from apps.audit.services import audit
from apps.patients.models import ConsentSettings, PatientProfile
from apps.shared.exceptions import UserFacingError
from apps.shared.permissions import authenticated_user, role_permission


def _token_error() -> UserFacingError:
    return UserFacingError("token_not_valid", status_code=status.HTTP_401_UNAUTHORIZED)


class RegisterSerializer(serializers.Serializer[dict[str, Any]]):
    email = serializers.EmailField()
    display_name = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    role = serializers.ChoiceField(choices=["patient", "caregiver", "doctor"])


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    @extend_schema(request=RegisterSerializer, responses={201: UserSummarySerializer})
    @transaction.atomic
    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        email = data["email"].lower()
        if (
            User.objects.filter(email__iexact=email).exists()
            or User.objects.filter(username__iexact=email).exists()
        ):
            raise serializers.ValidationError({"email": "An account already exists."})
        user = User(
            username=email, email=email, display_name=data["display_name"], role=data["role"]
        )
        try:
            validate_password(data["password"], user)
        except ValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        user.is_approved = user.role == User.Role.PATIENT
        user.set_password(data["password"])
        user.save()
        if user.role == User.Role.PATIENT:
            profile = PatientProfile.objects.create(user=user)
            ConsentSettings.objects.create(patient=profile)
        elif user.role == User.Role.DOCTOR:
            DoctorProfile.objects.create(user=user, verification_status="pending")
        audit(user, "account_created", user, request=request)
        return Response(UserSummarySerializer(user).data, status=201)


class ProfessionalLoginView(APIView):
    authentication_classes = []
    throttle_classes = (
        [LoginThrottle]
        if not settings.DEBUG and getattr(settings, "LOGIN_THROTTLING", False)
        else []
    )
    permission_classes = [AllowAny]

    @extend_schema(request=ProfessionalLoginSerializer, responses={200: LoginResponseSerializer})
    def post(self, request: Request) -> Response:
        serializer = ProfessionalLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = authenticate_professional(
                email_or_phone=serializer.validated_data["email_or_phone"],
                password=serializer.validated_data["password"],
            )
        except UserFacingError:
            audit(None, "login_failed", User, request=request)
            raise
        tokens = issue_tokens(user=user, device_id=serializer.validated_data["device_id"])
        audit(user, "login", user, request=request)
        return Response(
            {
                "access": tokens.access,
                "refresh": tokens.refresh,
                "user": UserSummarySerializer(user).data,
            }
        )


class PatientLoginView(APIView):
    authentication_classes = []
    throttle_classes = (
        [LoginThrottle]
        if not settings.DEBUG and getattr(settings, "LOGIN_THROTTLING", False)
        else []
    )
    permission_classes = [AllowAny]

    @extend_schema(
        request=PatientLoginSerializer,
        responses={200: LoginResponseSerializer, 423: LockedResponseSerializer},
    )
    def post(self, request: Request) -> Response:
        serializer = PatientLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = verify_pin(
                login_id=serializer.validated_data["login_id"],
                pin=serializer.validated_data["pin"],
            )
        except PinLocked as exc:
            audit(None, "login_failed", User, request=request)
            return Response(
                {
                    "detail": "locked",
                    "code": "locked",
                    "retry_after_seconds": exc.retry_after_seconds,
                },
                status=status.HTTP_423_LOCKED,
            )
        except UserFacingError:
            audit(None, "login_failed", User, request=request)
            raise
        tokens = issue_tokens(user=user, device_id=serializer.validated_data["device_id"])
        audit(user, "login", user, patient=user.patient_profile, request=request)
        return Response(
            {
                "access": tokens.access,
                "refresh": tokens.refresh,
                "user": UserSummarySerializer(user).data,
            }
        )


class PatientPinResetView(APIView):
    permission_classes = [IsAuthenticated, role_permission(User.Role.CAREGIVER)]

    @extend_schema(request=PatientPinResetSerializer, responses={204: None})
    def post(self, request: Request) -> Response:
        serializer = PatientPinResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reset_patient_pin(
            caregiver=authenticated_user(request),
            patient_id=str(serializer.validated_data["patient_id"]),
            pin=serializer.validated_data["new_pin"],
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class RefreshView(APIView):
    authentication_classes = []
    throttle_classes = (
        [LoginThrottle]
        if not settings.DEBUG and getattr(settings, "LOGIN_THROTTLING", False)
        else []
    )
    permission_classes = [AllowAny]

    @extend_schema(request=RefreshSerializer, responses={200: RotatedTokenResponseSerializer})
    def post(self, request: Request) -> Response:
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            tokens = refresh_session(refresh_token=serializer.validated_data["refresh"])
        except (InvalidToken, TokenError) as exc:
            raise _token_error() from exc
        return Response({"access": tokens.access, "refresh": tokens.refresh})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=LogoutSerializer, responses={204: None})
    def post(self, request: Request) -> Response:
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            logout_session(
                user=authenticated_user(request), refresh_token=serializer.validated_data["refresh"]
            )
        except (InvalidToken, TokenError) as exc:
            raise _token_error() from exc
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: MeSerializer})
    def get(self, request: Request) -> Response:
        user = authenticated_user(request)
        payload = {
            "user": UserSummarySerializer(user).data,
            "role": user.role,
            "preferences": PreferenceSerializer(user).data,
            "assignments": {
                "patients": PatientSummarySerializer(assigned_patients(user=user), many=True).data
            },
        }
        return Response(payload)


class PreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=PreferenceSerializer, responses={200: PreferenceSerializer})
    def patch(self, request: Request) -> Response:
        serializer = PreferenceSerializer(
            instance=authenticated_user(request), data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        previous = {
            field: str(getattr(authenticated_user(request), field))
            for field in serializer.validated_data
        }
        user = update_preferences(user=authenticated_user(request), **serializer.validated_data)
        audit(
            user,
            "update",
            user,
            patient=getattr(user, "patient_profile", None),
            changes={
                "before": previous,
                "after": {key: str(value) for key, value in serializer.validated_data.items()},
            },
            request=request,
        )
        return Response(PreferenceSerializer(user).data)
