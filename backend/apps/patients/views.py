"""Assignment-scoped patient and nested-resource endpoints."""

from datetime import timedelta
from typing import Any

from django.db.models.query import QuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
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
from apps.patients.media import media_url
from apps.patients.models import ConsentSettings, FamilyMember, PatientProfile
from apps.patients.selectors import patients_for
from apps.patients.serializers import (
    ConsentSettingsSerializer,
    FamilyMemberDoctorSerializer,
    FamilyMemberSerializer,
    OrientationSerializer,
    PatientCardSerializer,
    PatientProfileCaregiverSerializer,
    PatientProfileDoctorSerializer,
    ProgressSummarySerializer,
)
from apps.routines.models import Medication, Reminder
from apps.routines.serializers import (
    MedicationSerializer,
    ReminderResponseInputSerializer,
    ReminderResponseSerializer,
    ReminderSerializer,
    RoutineItemSerializer,
)
from apps.routines.services import record_response
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

    @extend_schema(responses=OrientationSerializer)
    @action(detail=True, methods=["get"], url_path="orientation")
    def orientation(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del request, args, kwargs
        patient = self.get_object()
        now = timezone.localtime()
        if now.hour < 12:
            greeting_key = "morning"
        elif now.hour < 17:
            greeting_key = "afternoon"
        else:
            greeting_key = "evening"

        next_reminder = patient.routine_reminders.filter(
            scheduled_at__date=now.date(),
            scheduled_at__gte=now,
            status__in=[Reminder.Status.PENDING, Reminder.Status.LATER],
        ).select_related("routine_item").first()
        members = list(patient.family_members.all())
        member = members[now.date().toordinal() % len(members)] if members else None
        family_member = None
        if member is not None:
            family_member = {
                "id": str(member.id),
                "name": member.name,
                "relationship": member.relationship_label or member.get_relationship_display(),
                "photo_url": media_url(member.photo),
            }

        payload = {
            "greeting_key": greeting_key,
            "day": now.strftime("%A"),
            "date": now.strftime("%B %-d, %Y"),
            "time": now.strftime("%-I:%M %p"),
            "home_label": patient.home_label,
            "next_activity": (
                {
                    "id": str(next_reminder.id),
                    "title": next_reminder.routine_item.title,
                    "scheduled_for": next_reminder.scheduled_at,
                }
                if next_reminder
                else None
            ),
            "family_member": family_member,
        }
        return Response(OrientationSerializer(payload).data)

    @extend_schema(responses=ProgressSummarySerializer)
    @action(detail=True, methods=["get"], url_path="progress-summary")
    def progress_summary(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del request, args, kwargs
        patient = self.get_object()
        today = timezone.localdate()
        completed = patient.routine_reminders.filter(
            scheduled_at__date=today, status=Reminder.Status.TAKEN
        ).count()
        streak = 0
        day = today
        while patient.routine_reminders.filter(
            scheduled_at__date=day, status=Reminder.Status.TAKEN
        ).exists():
            streak += 1
            day -= timedelta(days=1)
        upcoming = patient.routine_reminders.filter(
            status__in=[Reminder.Status.PENDING, Reminder.Status.LATER],
            scheduled_at__gte=timezone.now(),
        )[:3]
        payload = {
            "completed_today": completed,
            "points": completed * 10,
            "streak_days": streak,
            "favourite_games": [],
            "upcoming": [
                {
                    "id": str(item.id),
                    "title": item.routine_item.title,
                    "scheduled_at": item.scheduled_at,
                }
                for item in upcoming
            ],
        }
        return Response(ProgressSummarySerializer(payload).data)

    @action(detail=True, methods=["get"], url_path="routine-items")
    def routine_items(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del request, args, kwargs
        return Response(
            RoutineItemSerializer(self.get_object().routine_items.all(), many=True).data
        )

    @extend_schema(parameters=[OpenApiParameter("date", OpenApiTypes.DATE)])
    @action(detail=True, methods=["get"], url_path="reminders")
    def reminders(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del args, kwargs
        queryset = self.get_object().routine_reminders.select_related("routine_item")
        requested_date = request.query_params.get("date")
        if requested_date:
            queryset = queryset.filter(scheduled_at__date=requested_date)
        return Response(ReminderSerializer(queryset, many=True).data)

    @action(
        detail=True,
        methods=["post"],
        url_path=r"reminders/(?P<reminder_id>[^/.]+)/respond",
    )
    def respond(self, request: Request, reminder_id: str, *args: Any, **kwargs: Any) -> Response:
        del args, kwargs
        patient = self.get_object()
        if request.user.role != User.Role.PATIENT:
            raise PermissionDenied("Only the patient can respond to reminders.")
        reminder = get_object_or_404(patient.routine_reminders.all(), id=reminder_id)
        serializer = ReminderResponseInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response = record_response(reminder=reminder, **serializer.validated_data)
        return Response(ReminderResponseSerializer(response).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="medications")
    def medications(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del request, args, kwargs
        patient = self.get_object()
        queryset = Medication.objects.filter(patient=patient, active=True)
        return Response(MedicationSerializer(queryset, many=True).data)

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
