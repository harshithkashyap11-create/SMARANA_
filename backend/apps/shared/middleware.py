"""Prevent shared HTTP caches from retaining credentials or patient API responses."""

from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin


class PrivateApiCacheMiddleware(MiddlewareMixin):
    def process_response(self, request: HttpRequest, response: HttpResponse) -> HttpResponse:
        if request.path.startswith("/api/") and not request.path.startswith(
            ("/api/v1/content/", "/api/v1/health/")
        ):
            response["Cache-Control"] = "private, no-store"
        return response
