"""Infrastructure endpoints."""

from django.db import DatabaseError, connection
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers, status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response


@extend_schema(
    operation_id="health_check",
    request=None,
    responses={
        200: inline_serializer(
            name="HealthOk",
            fields={
                "status": serializers.CharField(),
                "db": serializers.CharField(),
            },
        ),
        503: inline_serializer(
            name="HealthUnavailable",
            fields={
                "status": serializers.CharField(),
                "db": serializers.CharField(),
            },
        ),
    },
)
@api_view(["GET"])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([])
def health_check(request: Request) -> Response:
    """Confirm that the API process and its database are available."""
    del request
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except DatabaseError:
        return Response(
            {"status": "unavailable", "db": "unavailable"},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response({"status": "ok", "db": "ok"})
