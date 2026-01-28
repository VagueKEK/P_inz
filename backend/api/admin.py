from django.contrib import admin
from .models import Subscription

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "user", "price", "active", "next_payment")
    list_filter = ("active",)
    search_fields = ("name", "user__username", "user__email")
