from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.games.models import GameDefinition
from apps.games.serializers import GameDefinitionSerializer, GameSessionInputSerializer
from apps.games.services import save_session
from apps.patients.selectors import patients_for


class GameList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        del request
        return Response(
            GameDefinitionSerializer(GameDefinition.objects.filter(active=True), many=True).data
        )


class PatientGameSessionList(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, patient_id: str) -> Response:
        patient = get_object_or_404(
            patients_for(request.user).filter(user=request.user), id=patient_id
        )
        serializer = GameSessionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session, state, change, message_key = save_session(
            patient, request.user, dict(serializer.validated_data)
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
