"""Authentication routes."""

from django.urls import path

from apps.accounts.views import (
    LogoutView,
    MeView,
    PatientLoginView,
    PatientPinResetView,
    PreferenceView,
    ProfessionalLoginView,
    RefreshView,
    RegisterView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", ProfessionalLoginView.as_view(), name="professional-login"),
    path("patient/login/", PatientLoginView.as_view(), name="patient-login"),
    path("patient/pin-reset/", PatientPinResetView.as_view(), name="patient-pin-reset"),
    path("refresh/", RefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("me/preferences/", PreferenceView.as_view(), name="preferences"),
]
