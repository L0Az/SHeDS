from rest_framework.exceptions import NotFound

from app.accounts.models import User


def get_user(user_id: int) -> User:
    if user := User.objects.filter(id=user_id).first():
        return user
    raise NotFound("User not found.")
