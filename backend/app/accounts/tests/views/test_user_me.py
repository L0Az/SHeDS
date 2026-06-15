from django.contrib.auth.models import Permission
from rest_framework import status

from app.accounts import choices as account_choices
from app.accounts.tests.factories import UserFactory


def test_me_unauthenticated(api_client):
    response = api_client.get("/v1/accounts/me/")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_me_returns_own_data(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/accounts/me/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["id"] == user.pk
    assert response.data["email"] == user.email
    assert response.data["name"] == user.name


def test_me_includes_permissions_field(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/accounts/me/")

    assert response.status_code == status.HTTP_200_OK
    assert "permissions" in response.data


def test_me_empty_permissions_by_default(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/accounts/me/")

    assert response.data["permissions"] == []


def test_me_returns_granted_permissions(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    perm = Permission.objects.get(codename="view_ticket")
    user.user_permissions.add(perm)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/accounts/me/")

    assert "view_ticket" in response.data["permissions"]


def test_me_does_not_expose_other_users_data(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/accounts/me/")

    assert response.data["id"] != other.pk
    assert response.data["email"] != other.email
