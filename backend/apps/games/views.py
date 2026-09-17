from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.games.models import DifficultyChange, GameDefinition, GameSession
from apps.games.serializers import GameDefinitionSerializer, GameSessionInputSerializer
from apps.games.services import save_session
from apps.patients.selectors import patients_for
from apps.shared.permissions import authenticated_user


class GameList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        del request
        return Response(
            GameDefinitionSerializer(GameDefinition.objects.filter(active=True), many=True).data
        )


class PatientGameSessionList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, patient_id: str) -> Response:
        if authenticated_user(request).role not in {User.Role.CAREGIVER, User.Role.DOCTOR}:
            return Response(status=status.HTTP_404_NOT_FOUND)
        patient = get_object_or_404(patients_for(authenticated_user(request)), id=patient_id)
        queryset = GameSession.objects.filter(patient=patient, guest_mode=False).select_related(
            "game"
        )
        if game_key := request.query_params.get("game"):
            queryset = queryset.filter(game__key=game_key)
        if start := request.query_params.get("from"):
            queryset = queryset.filter(ended_at__date__gte=start)
        if end := request.query_params.get("to"):
            queryset = queryset.filter(ended_at__date__lte=end)
        return Response(
            [
                {
                    "id": str(row.id),
                    "game_key": row.game.key,
                    "game_name": row.game.name,
                    "level": row.level,
                    "metrics": row.metrics,
                    "started_at": row.started_at,
                    "ended_at": row.ended_at,
                }
                for row in queryset
            ]
        )

    def post(self, request: Request, patient_id: str) -> Response:
        queryset = patients_for(authenticated_user(request))
        if authenticated_user(request).role != User.Role.PATIENT:
            if (
                authenticated_user(request).role != User.Role.CAREGIVER
                or request.data.get("guest_mode") is not True
            ):
                return Response(status=status.HTTP_404_NOT_FOUND)
        patient = get_object_or_404(queryset, id=patient_id)
        serializer = GameSessionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session, state, change, message_key = save_session(
            patient, authenticated_user(request), dict(serializer.validated_data)
        )
        return Response(
            {
                "session_id": str(session.id),
                "state": {
                    "level": state.level,
                    "window": state.window,
                    "locked_by_doctor": state.locked_by_doctor,
                    "cap_level": state.cap_level,
                },
                "change": None
                if change is None
                else {
                    "from_level": change.from_level,
                    "to_level": change.to_level,
                    "reason_code": change.reason_code,
                    "explanation": change.explanation,
                },
                "message_key": message_key,
            },
            status=status.HTTP_201_CREATED,
        )


class PatientDifficultyChangeList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, patient_id: str) -> Response:
        if authenticated_user(request).role not in {User.Role.CAREGIVER, User.Role.DOCTOR}:
            return Response(status=status.HTTP_404_NOT_FOUND)
        patient = get_object_or_404(patients_for(authenticated_user(request)), id=patient_id)
        rows = DifficultyChange.objects.filter(state__patient=patient).select_related("state__game")
        return Response(
            [
                {
                    "id": str(row.id),
                    "game_key": row.state.game.key,
                    "game_name": row.state.game.name,
                    "from_level": row.from_level,
                    "to_level": row.to_level,
                    "reason_code": row.reason_code,
                    "explanation": row.explanation,
                    "created_at": row.created_at,
                }
                for row in rows
            ]
        )
