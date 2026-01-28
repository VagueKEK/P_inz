from django.contrib import admin
from django.urls import path, include
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.routers import DefaultRouter

from api.views import (
    SubscriptionViewSet,
    login_view, logout_view, me_view, register_view,
    SettingsMeView,
    AdminUsersView, AdminUserDetailView, AdminResetPasswordView, AdminClearSubscriptionsView
)

def health(_):
    return HttpResponse("<h3>Backend OK ✅</h3>", content_type="text/html")

@ensure_csrf_cookie
def set_csrf(request):
    return JsonResponse({"detail": "CSRF cookie set"})

router = DefaultRouter()
router.register("subscriptions", SubscriptionViewSet, basename="subscription")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", health),

    path("api/csrf/", set_csrf),

    path("api/auth/login/", login_view),
    path("api/auth/register/", register_view),
    path("api/auth/logout/", logout_view),
    path("api/auth/me/", me_view),

    path("api/settings/me/", SettingsMeView.as_view()),

    path("api/admin/users/", AdminUsersView.as_view()),
    path("api/admin/users/<int:user_id>/", AdminUserDetailView.as_view()),
    path("api/admin/users/<int:user_id>/reset-password/", AdminResetPasswordView.as_view()),
    path("api/admin/users/<int:user_id>/clear-subscriptions/", AdminClearSubscriptionsView.as_view()),

    path("api/", include(router.urls)),
]
