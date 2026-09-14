"""Authentication routes."""

from django.urls import path

from apps.accounts.views import (
    LogoutView,
    MeView,
    PreferenceView,
    ProfessionalLoginView,
    RefreshView,
)

urlpatterns = [
    path("login/", ProfessionalLoginView.as_view(), name="professional-login"),
    path("refresh/", RefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("me/preferences/", PreferenceView.as_view(), name="preferences"),
]
