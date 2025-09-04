from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.routers import DefaultRouter
from api.views import SubscriptionViewSet

def health(_):
    return HttpResponse("<h3>Backend OK ✅</h3>", content_type="text/html")

# ⬇️ Ustawiamy CSRF cookie
@ensure_csrf_cookie
def set_csrf(request):
    return JsonResponse({"detail": "CSRF cookie set"})

router = DefaultRouter()
router.register("subscriptions", SubscriptionViewSet, basename="subscription")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", health),
    path("api/csrf/", set_csrf),                # ⬅️ NOWE
    path("api/", include(router.urls)),         # -> /api/subscriptions/
]
