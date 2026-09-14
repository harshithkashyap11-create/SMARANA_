"""Thin HTTP adapters for authentication and account preferences."""

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError

from apps.accounts.serializers import (
    LoginResponseSerializer,
    LogoutSerializer,
    MeSerializer,
    PatientSummarySerializer,
    PreferenceSerializer,
    ProfessionalLoginSerializer,
    RefreshSerializer,
    RotatedTokenResponseSerializer,
    UserSummarySerializer,
)
from apps.accounts.services import (
    assigned_patients,
    authenticate_professional,
    issue_tokens,
    logout_session,
    refresh_session,
    update_preferences,
)
from apps.shared.exceptions import UserFacingError


def _token_error() -> UserFacingError:
    return UserFacingError("token_not_valid", status_code=status.HTTP_401_UNAUTHORIZED)


class ProfessionalLoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=ProfessionalLoginSerializer, responses={200: LoginResponseSerializer})
    def post(self, request: Request) -> Response:
        serializer = ProfessionalLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate_professional(
            email_or_phone=serializer.validated_data["email_or_phone"],
            password=serializer.validated_data["password"],
        )
        tokens = issue_tokens(user=user, device_id=serializer.validated_data["device_id"])
        return Response(
            {
                "access": tokens.access,
                "refresh": tokens.refresh,
                "user": UserSummarySerializer(user).data,
            }
        )


class RefreshView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=RefreshSerializer, responses={200: RotatedTokenResponseSerializer})
    def post(self, request: Request) -> Response:
        serializer = RefreshSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            tokens = refresh_session(refresh_token=serializer.validated_data["refresh"])
        except TokenError as exc:
            raise _token_error() from exc
        return Response({"access": tokens.access, "refresh": tokens.refresh})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=LogoutSerializer, responses={204: None})
    def post(self, request: Request) -> Response:
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            logout_session(user=request.user, refresh_token=serializer.validated_data["refresh"])
        except TokenError as exc:
            raise _token_error() from exc
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: MeSerializer})
    def get(self, request: Request) -> Response:
        user = request.user
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
        serializer = PreferenceSerializer(instance=request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = update_preferences(user=request.user, **serializer.validated_data)
        return Response(PreferenceSerializer(user).data)
