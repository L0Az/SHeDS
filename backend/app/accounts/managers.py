from django.contrib.auth.models import BaseUserManager
from app.accounts import choices as accounts_choices


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **kwargs):
        email = self.normalize_email(email)
        user = self.model(email=email, **kwargs)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, **kwargs):
        user = self.create_user(**kwargs)
        user.is_superuser = True
        user.is_staff = True
        user.type = accounts_choices.ADMIN_USER_TYPE
        user.save(using=self._db)
        return user
    
    def create_technician(self, **kwargs):
        user = self.create_user(**kwargs)
        user.is_staff = True
        user.type = accounts_choices.TECHNICIAN_USER_TYPE
        user.save(using=self._db)
        return user
