from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .providers import safe_route


class VoiceThrottle(UserRateThrottle):
    rate = "20/min"


class RouteView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [VoiceThrottle]

    def post(self, request: Request) -> Response:
        if not settings.VOICE_LLM_FALLBACK:
            return Response({"intent": None, "slots": {}, "confidence": 0})
        result = safe_route(
            str(request.data.get("utterance", "")), str(request.data.get("language", "en"))
        )
        if result is None:
            return Response({"intent": None, "slots": {}, "confidence": 0})
        return Response(
            {"intent": result.intent, "slots": result.slots, "confidence": result.confidence}
        )
