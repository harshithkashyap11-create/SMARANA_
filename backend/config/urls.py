"""Root URL configuration."""

from django.http import HttpRequest, JsonResponse
from django.urls import path


def health_check(request: HttpRequest) -> JsonResponse:
    """Report that the development backend is running."""
    return JsonResponse({"status": "ok"})


urlpatterns = [path("health/", health_check, name="health-check")]
