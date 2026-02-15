from rest_framework import serializers
from .models import Subscription, UserSettings


class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ["id", "name", "price", "next_payment", "period", "active"]


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = ["currency_code", "currency_symbol", "limit_on", "limit_val"]