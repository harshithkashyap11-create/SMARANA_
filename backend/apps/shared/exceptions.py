"""Patient-safe API exception handling."""

from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler


class UserFacingError(APIException):
    """Return a stable translation key without exposing internals."""

    status_code = 400
    default_detail = "request_not_completed"
    default_code = "request_not_completed"

    def __init__(self, code: str, *, status_code: int | None = None) -> None:
        self.user_code = code
        if status_code is not None:
            self.status_code = status_code
        super().__init__(detail=code, code=code)


def user_facing_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Normalize explicitly safe errors for frontend translation."""
    if isinstance(exc, DjangoValidationError):
        # Invalid UUID/date filters must not become 500s or disclose object values.
        exc = ValidationError("Use valid request values.")
    response = exception_handler(exc, context)
    if response is not None and isinstance(exc, UserFacingError):
        response.data = {"detail": exc.user_code, "code": exc.user_code}
    return response
