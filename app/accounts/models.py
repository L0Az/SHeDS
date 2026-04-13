from django.db import models
from django.contrib.auth.models import AbstractBaseUser

from app.accounts.managers import UserManager


class User(AbstractBaseUser):
    USERNAME_FIELD = "email"
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)

    objects = UserManager()

    class Meta:
        verbose_name = "Usuário"
        verbose_name_plural = "Usuários"

    def __str__(self):
        return self.email

    def get_full_name(self):
        return self.name

    def get_short_name(self):
        return self.name

    @property
    def username(self):
        return self.email