"""Assignment-scoped patient and nested-resource endpoints."""

from typing import Any

from django.db.models.query import QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.accounts.models import User
from apps.patients import services
from apps.patients.models import ConsentSettings, FamilyMember, PatientProfile
from apps.patients.selectors import patients_for
from apps.patients.serializers import (
    ConsentSettingsSerializer,
    FamilyMemberDoctorSerializer,
    FamilyMemberSerializer,
    PatientCardSerializer,
    PatientProfileCaregiverSerializer,
    PatientProfileDoctorSerializer,
)
from apps.shared.permissions import IsRole


class PatientViewSet(ReadOnlyModelViewSet):
    queryset = PatientProfile.objects.none()
    serializer_class = PatientCardSerializer
    permission_classes = [
        IsAuthenticated,
        IsRole(User.Role.CAREGIVER, User.Role.DOCTOR, User.Role.PATIENT),
    ]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_queryset(self) -> QuerySet[PatientProfile]:
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        return patients_for(self.request.user)

    def _require_primary_caregiver(self, patient: PatientProfile) -> None:
        if not patient.care_assignments.filter(
            caregiver=self.request.user, active=True, is_primary=True
        ).exists():
            raise PermissionDenied("Only the primary caregiver can make this change.")

    @action(detail=True, methods=["patch"], url_path="profile")
    def profile(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del args, kwargs
        patient = self.get_object()
        if request.user.role == User.Role.CAREGIVER:
            self._require_primary_caregiver(patient)
            serializer_class = PatientProfileCaregiverSerializer
        elif request.user.role == User.Role.DOCTOR:
            serializer_class = PatientProfileDoctorSerializer
        else:
            raise PermissionDenied("This profile cannot be changed by this role.")
        serializer = serializer_class(patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        patient = services.update_profile(
            actor=request.user,
            patient=patient,
            fields=dict(serializer.validated_data),
        )
        return Response(serializer_class(patient).data)

    @action(detail=True, methods=["get", "post"], url_path="family")
    def family(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del args, kwargs
        patient = self.get_object()
        if request.method == "POST":
            if request.user.role != User.Role.CAREGIVER:
                raise PermissionDenied("Only caregivers can add family members.")
            serializer = FamilyMemberSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            member = services.create_family_member(
                actor=request.user,
                patient=patient,
                fields=dict(serializer.validated_data),
            )
            return Response(FamilyMemberSerializer(member).data, status=status.HTTP_201_CREATED)

        members = patient.family_members.all()
        serializer_class = (
            FamilyMemberDoctorSerializer
            if request.user.role == User.Role.DOCTOR
            else FamilyMemberSerializer
        )
        return Response(serializer_class(members, many=True).data)

    @extend_schema(
        parameters=[OpenApiParameter("family_id", OpenApiTypes.UUID, OpenApiParameter.PATH)]
    )
    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"family/(?P<family_id>[^/.]+)",
    )
    def family_detail(
        self, request: Request, family_id: str, *args: Any, **kwargs: Any
    ) -> Response:
        del args, kwargs
        patient = self.get_object()
        if request.user.role != User.Role.CAREGIVER:
            raise PermissionDenied("Only caregivers can change family members.")
        member = get_object_or_404(FamilyMember.objects.filter(patient=patient), pk=family_id)
        if request.method == "DELETE":
            services.delete_family_member(actor=request.user, member=member)
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = FamilyMemberSerializer(member, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        member = services.update_family_member(
            actor=request.user,
            member=member,
            fields=dict(serializer.validated_data),
        )
        return Response(FamilyMemberSerializer(member).data)

    @action(detail=True, methods=["get", "patch"], url_path="consent")
    def consent(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del args, kwargs
        patient = self.get_object()
        if request.user.role == User.Role.CAREGIVER:
            self._require_primary_caregiver(patient)
        elif request.user.role != User.Role.PATIENT:
            raise PermissionDenied("Consent is controlled by the patient and primary caregiver.")
        consent, _ = ConsentSettings.objects.get_or_create(patient=patient)
        if request.method == "PATCH":
            serializer = ConsentSettingsSerializer(consent, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            consent = services.update_consent(
                actor=request.user,
                consent=consent,
                fields=dict(serializer.validated_data),
            )
        return Response(ConsentSettingsSerializer(consent).data)
