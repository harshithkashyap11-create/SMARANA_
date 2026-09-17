from django.urls import path

from apps.content.views import ContentPackView

urlpatterns = [path("content/pack/", ContentPackView.as_view(), name="content-pack")]
