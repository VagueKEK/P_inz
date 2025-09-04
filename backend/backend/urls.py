from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse
from rest_framework.routers import DefaultRouter
from api.views import SubscriptionViewSet     # <-- z apki 'api'

def health(_):
    return HttpResponse("<h3>Backend OK ✅</h3>", content_type="text/html")

router = DefaultRouter()
router.register("subscriptions", SubscriptionViewSet, basename="subscription")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", health),
    path("api/", include(router.urls)),  # -> /api/subscriptions/
]
