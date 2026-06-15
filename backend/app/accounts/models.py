from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

from app.accounts import choices as accounts_choices
from app.accounts.managers import UserManager
from app.common.models import DefaultModel


class User(AbstractBaseUser, PermissionsMixin, DefaultModel):
    USERNAME_FIELD = "email"
    name = models.CharField(max_length=255, null=True, blank=True)
    email = models.EmailField(unique=True, null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.ForeignKey("helpdesk.Department", on_delete=models.SET_NULL, blank=True, null=True)
    language = models.CharField(max_length=2, choices=accounts_choices.LANGUAGE_CHOICES, default=accounts_choices.EN_LANGUAGE_OPTION)
    type = models.CharField(max_length=20, choices=accounts_choices.USER_TYPE_CHOICES, default=accounts_choices.CUSTOMER_USER_TYPE)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"
        permissions = [
            ('change_permissions', 'Can change user permissions'),
        ]


class UserNotifications(DefaultModel):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    ticket = models.ForeignKey("helpdesk.Ticket", on_delete=models.SET_NULL, related_name="notifications", blank=True, null=True)
    kind = models.CharField(max_length=50, choices=accounts_choices.NOTIFICATION_KIND_CHOICES, default=accounts_choices.NOTIFICATION_KIND_TICKET_STATUS_CHANGED)
    content = models.TextField()
    read_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "Notificação do Usuário"
        verbose_name_plural = "Notificações dos Usuários"
