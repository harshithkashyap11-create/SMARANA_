"""Authentication and role models."""

from decimal import Decimal
from uuid import uuid4

from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class User(AbstractUser):
    """Application user with a stable role and accessibility preferences."""

    class Role(models.TextChoices):
        PATIENT = "patient", "Patient"
        CAREGIVER = "caregiver", "Caregiver"
        DOCTOR = "doctor", "Doctor"
        ADMIN = "admin", "Admin"

    class Theme(models.TextChoices):
        LIGHT = "light", "Light"
        DARK = "dark", "Dark"

    id = models.UUIDField(primary_key=True, default=uuid4, editable=False)
    role = models.CharField(max_length=16, choices=Role.choices)
    display_name = models.CharField(max_length=150, blank=True)
    theme = models.CharField(max_length=8, choices=Theme.choices, default=Theme.LIGHT)
    font_scale = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=Decimal("1.0"),
        validators=[MinValueValidator(Decimal("1.0")), MaxValueValidator(Decimal("1.6"))],
    )
    is_approved = models.BooleanField(default=False)
    phone = models.CharField(max_length=32, blank=True)

    REQUIRED_FIELDS = ["role"]

    class Meta:
        ordering = ["username"]

    def __str__(self) -> str:
        return self.display_name or self.username
