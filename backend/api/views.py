from django.contrib.auth import authenticate, login, logout, get_user_model
from django.db.models import Q
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subscription, UserSettings
from .serializers import SubscriptionSerializer, UserSettingsSerializer

User = get_user_model()


class IsActiveAuthenticated(permissions.BasePermission):
    message = "To konto zostało zdezaktywowane. Skontaktuj się z administratorem."

    def has_permission(self, request, view):
        u = getattr(request, "user", None)
        return bool(u and u.is_authenticated and u.is_active)


class SubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsActiveAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user).order_by("id")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_view(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""

    u = User.objects.filter(username__iexact=username).only("id", "is_active", "is_staff", "username").first()
    if u and not u.is_active:
        return Response(
            {"ok": False, "error": "To konto zostało zdezaktywowane. Skontaktuj się z administratorem."},
            status=status.HTTP_403_FORBIDDEN
        )

    user = authenticate(request, username=username, password=password)
    if not user:
        return Response(
            {"ok": False, "error": "Nieprawidłowy login lub hasło."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    login(request, user)
    return Response({"ok": True, "user": {"id": user.id, "username": user.username, "isAdmin": user.is_staff}})


@api_view(["POST"])
@permission_classes([IsActiveAuthenticated])
def logout_view(request):
    logout(request)
    return Response({"ok": True})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def me_view(request):
    u = request.user
    if u.is_authenticated and not u.is_active:
        logout(request)
        return Response(
            {"isAuthenticated": False, "user": None, "error": IsActiveAuthenticated.message},
            status=status.HTTP_403_FORBIDDEN
        )
    return Response({
        "isAuthenticated": u.is_authenticated,
        "user": ({"id": u.id, "username": u.username, "isAdmin": u.is_staff} if u.is_authenticated else None)
    })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_view(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password") or ""
    email = (request.data.get("email") or "").strip()

    if not username:
        return Response({"ok": False, "error": "Wymagany login"}, status=400)
    if len(password) < 8:
        return Response({"ok": False, "error": "Hasło jest za krótkie. (min 8)"}, status=400)
    if User.objects.filter(username=username).exists():
        return Response({"ok": False, "error": "Username already taken"}, status=400)

    u = User(username=username, email=email)
    u.set_password(password)
    u.save()

    UserSettings.objects.get_or_create(user=u)

    login(request, u)
    return Response({"ok": True, "user": {"id": u.id, "username": u.username, "isAdmin": u.is_staff}})


class SettingsMeView(APIView):
    permission_classes = [IsActiveAuthenticated]

    def get(self, request):
        s, _ = UserSettings.objects.get_or_create(user=request.user)
        return Response(UserSettingsSerializer(s).data)

    def patch(self, request):
        s, _ = UserSettings.objects.get_or_create(user=request.user)
        ser = UserSettingsSerializer(s, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


class AdminUsersView(APIView):
    permission_classes = [permissions.IsAdminUser, IsActiveAuthenticated]

    def get(self, request):
        q = (request.query_params.get("q") or "").strip()
        qs = User.objects.all().order_by("id")
        if q:
            qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q))
        users = qs.values("id", "username", "email", "is_staff", "is_superuser", "is_active", "date_joined", "last_login")
        return Response(list(users))


class AdminUserDetailView(APIView):
    permission_classes = [permissions.IsAdminUser, IsActiveAuthenticated]

    def patch(self, request, user_id: int):
        is_active = request.data.get("is_active", None)
        if is_active is None:
            return Response({"ok": False, "error": "Missing is_active"}, status=400)

        if isinstance(is_active, str):
            s = is_active.strip().lower()
            if s in ["true", "1", "yes", "y", "on"]:
                is_active = True
            elif s in ["false", "0", "no", "n", "off"]:
                is_active = False
            else:
                return Response({"ok": False, "error": "Invalid is_active"}, status=400)

        if isinstance(is_active, (int, float)) and not isinstance(is_active, bool):
            is_active = bool(is_active)

        if not isinstance(is_active, bool):
            return Response({"ok": False, "error": "Invalid is_active"}, status=400)

        try:
            u = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"ok": False, "error": "User not found"}, status=404)

        if u.id == request.user.id and is_active is False:
            return Response({"ok": False, "error": "Nie możesz zdezaktywować własnego konta."}, status=400)

        u.is_active = is_active
        u.save()
        return Response({"ok": True, "user": {"id": u.id, "is_active": u.is_active}})

    def delete(self, request, user_id: int):
        try:
            u = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"ok": False, "error": "User not found"}, status=404)

        if u.id == request.user.id:
            return Response({"ok": False, "error": "Nie możesz usunąć własnego konta."}, status=400)

        u.delete()
        return Response({"ok": True})


class AdminResetPasswordView(APIView):
    permission_classes = [permissions.IsAdminUser, IsActiveAuthenticated]

    def post(self, request, user_id: int):
        new_pw = request.data.get("newPassword")
        if not new_pw or len(str(new_pw)) < 8:
            return Response({"ok": False, "error": "Hasło jest za krótkie. (min 8)"}, status=400)

        try:
            u = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"ok": False, "error": "User not found"}, status=404)

        u.set_password(new_pw)
        u.save()
        return Response({"ok": True})


class AdminClearSubscriptionsView(APIView):
    permission_classes = [permissions.IsAdminUser, IsActiveAuthenticated]

    def post(self, request, user_id: int):
        try:
            User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"ok": False, "error": "User not found"}, status=404)

        deleted, _ = Subscription.objects.filter(user_id=user_id).delete()
        return Response({"ok": True, "deleted": deleted})
