from rest_framework import status

from app.accounts.models import User
from app.accounts.tests.factories import UserFactory


def test_creates_first_superuser(api_client):
    response = api_client.post("/v1/accounts/first/user/", {"name": "Admin", "email": "first@example.com", "password": "pass"})

    assert response.status_code == status.HTTP_201_CREATED
    assert User.objects.filter(email="first@example.com", is_superuser=True).exists()
    assert "access" in response.data
    assert "refresh" in response.data


def test_blocked_when_user_already_exists(api_client):
    UserFactory(email="first@example.com", password="pass")

    response = api_client.post("/v1/accounts/first/user/", {"email": "new@example.com", "password": "pass"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST
