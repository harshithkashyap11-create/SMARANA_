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
from apps.audit.models import AuditEvent
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
from apps.routines.models import Medication, Reminder, RoutineItem
from apps.routines.serializers import (
    AdherenceReminderSerializer,
    MedicationSerializer,
    ReminderResponseInputSerializer,
    ReminderResponseSerializer,
    ReminderSerializer,
    RoutineHistorySerializer,
    RoutineItemSerializer,
)
from apps.routines.services import (
    create_routine_item,
    delete_routine_item,
    record_response,
    update_routine_item,
    upsert_medication,
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

        next_reminder = (
            patient.routine_reminders.filter(
                scheduled_at__date=now.date(),
                scheduled_at__gte=now,
                status__in=[Reminder.Status.PENDING, Reminder.Status.LATER],
            )
            .select_related("routine_item")
            .first()
        )
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

    @action(detail=True, methods=["get", "post"], url_path="routine-items")
    def routine_items(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del args, kwargs
        patient = self.get_object()
        if request.method == "POST":
            if request.user.role not in (User.Role.CAREGIVER, User.Role.DOCTOR):
                raise PermissionDenied("Only care-team members can add routine items.")
            serializer = RoutineItemSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            item = create_routine_item(
                actor=request.user, patient=patient, fields=dict(serializer.validated_data)
            )
            return Response(RoutineItemSerializer(item).data, status=status.HTTP_201_CREATED)
        return Response(
            RoutineItemSerializer(
                patient.routine_items.select_related("created_by"), many=True
            ).data
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"routine-items/(?P<routine_item_id>[^/.]+)",
    )
    def routine_item_detail(
        self, request: Request, routine_item_id: str, *args: Any, **kwargs: Any
    ) -> Response:
        del args, kwargs
        patient = self.get_object()
        item = get_object_or_404(patient.routine_items.all(), id=routine_item_id)
        if request.user.role not in (User.Role.CAREGIVER, User.Role.DOCTOR):
            raise PermissionDenied("Only care-team members can change routine items.")
        if request.method == "DELETE":
            delete_routine_item(actor=request.user, item=item)
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = RoutineItemSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = update_routine_item(
            actor=request.user, item=item, fields=dict(serializer.validated_data)
        )
        return Response(RoutineItemSerializer(item).data)

    @action(
        detail=True, methods=["get"], url_path=r"routine-items/(?P<routine_item_id>[^/.]+)/history"
    )
    def routine_item_history(
        self, request: Request, routine_item_id: str, *args: Any, **kwargs: Any
    ) -> Response:
        del request, args, kwargs
        patient = self.get_object()
        item = get_object_or_404(patient.routine_items.all(), id=routine_item_id)
        rows = AuditEvent.objects.filter(
            patient=patient, target_model=item._meta.label, target_id=item.id
        ).select_related("actor")
        payload = [
            {
                "id": row.id,
                "actor_name": row.actor.display_name if row.actor else None,
                "actor_role": row.actor_role,
                "action": row.action,
                "changes": row.changes,
                "created_at": row.created_at,
            }
            for row in rows
        ]
        return Response(RoutineHistorySerializer(payload, many=True).data)

    @action(detail=True, methods=["get"], url_path="adherence")
    def adherence(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del args, kwargs
        if request.user.role not in (User.Role.CAREGIVER, User.Role.DOCTOR):
            raise PermissionDenied("Only care-team members can view adherence.")
        try:
            days = min(31, max(1, int(request.query_params.get("days", "7"))))
        except ValueError:
            days = 7
        patient = self.get_object()
        today = timezone.localdate()
        start = today - timedelta(days=days - 1)
        reminders = (
            patient.routine_reminders.filter(
                routine_item__category=RoutineItem.Category.MEDICINE,
                scheduled_at__date__range=(start, today),
            )
            .select_related("routine_item")
            .prefetch_related("responses")
        )
        by_day = []
        counts = {choice: 0 for choice, _ in Reminder.Status.choices}
        for offset in range(days):
            day = start + timedelta(days=offset)
            day_rows = [row for row in reminders if timezone.localdate(row.scheduled_at) == day]
            for row in day_rows:
                counts[row.status] += 1
            by_day.append(
                {
                    "date": day.isoformat(),
                    "reminders": AdherenceReminderSerializer(day_rows, many=True).data,
                }
            )
        return Response({"days": by_day, "summary": counts})

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

    @action(detail=True, methods=["get", "post"], url_path="medications")
    def medications(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del args, kwargs
        patient = self.get_object()
        if request.method == "POST":
            if request.user.role != User.Role.DOCTOR:
                raise PermissionDenied("Only doctors can prescribe medications.")
            serializer = MedicationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            medication = upsert_medication(
                actor=request.user,
                patient=patient,
                fields=dict(serializer.validated_data),
            )
            return Response(MedicationSerializer(medication).data, status=status.HTTP_201_CREATED)
        queryset = Medication.objects.filter(patient=patient, active=True)
        return Response(MedicationSerializer(queryset, many=True).data)

    @action(detail=True, methods=["get", "patch"], url_path="profile")
    def profile(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        del args, kwargs
        patient = self.get_object()
        if request.method == "GET":
            if request.user.role == User.Role.CAREGIVER:
                self._require_primary_caregiver(patient)
            elif request.user.role != User.Role.PATIENT:
                raise PermissionDenied("This profile cannot be viewed by this role.")
            return Response(PatientProfileCaregiverSerializer(patient).data)
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
