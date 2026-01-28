from django.db import models
from django.conf import settings


class Subscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
        null=True,
        blank=True
    )
    name = models.CharField(max_length=120)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    next_payment = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class UserSettings(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settings"
    )
    currency_code = models.CharField(max_length=3, default="PLN")
    currency_symbol = models.CharField(max_length=8, default="zł")
    limit_on = models.BooleanField(default=False)
    limit_val = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"Settings({self.user_id})"
