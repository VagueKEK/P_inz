from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Subscription
from .serializers import SubscriptionSerializer

class SubscriptionViewSet(viewsets.ModelViewSet):
    """
    Podstawowy CRUD na modelu Subscription
    + dodatkowa akcja: dezaktywacja subskrypcji.
    """
    queryset = Subscription.objects.all().order_by("id")
    serializer_class = SubscriptionSerializer

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        """
        POST /api/subscriptions/{id}/deactivate/
        Ustawia active=False i zwraca {"status": "deactivated"}.
        """
        sub = self.get_object()
        sub.active = False
        sub.save()
        return Response({"status": "deactivated"}, status=status.HTTP_200_OK)
