from django.db import models
from django.utils import timezone

class Subscription(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=6, decimal_places=2)
    active = models.BooleanField(default=True)
    next_payment_date = models.DateField(default=timezone.now)

    def __str__(self):
        return self.name

