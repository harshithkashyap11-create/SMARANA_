"""Additional login rate limit using the shared production cache."""

from rest_framework.throttling import AnonRateThrottle


class LoginThrottle(AnonRateThrottle):
    scope = "login"
    rate = "10/min"
