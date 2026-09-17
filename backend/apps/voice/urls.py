from django.urls import path

from .views import ReadinessView, RouteView

urlpatterns = [path("route/", RouteView.as_view()), path("readiness/", ReadinessView.as_view())]
