from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from rest_framework import status

from app.accounts import choices as account_choices
from app.accounts.models import User
from app.accounts.tests.factories import UserFactory


def get_model_perm(codename):
    ct = ContentType.objects.get_for_model(User)
    return Permission.objects.get(content_type=ct, codename=codename)


def test_list_unauthenticated(api_client):
    response = api_client.get("/v1/accounts/users/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_as_admin(api_client):
    user = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/accounts/users/")

    assert response.status_code == status.HTTP_200_OK


def test_list_blocked_without_permission(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/accounts/users/")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_list_allowed_with_view_permission(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    customer.user_permissions.add(get_model_perm("view_user"))
    api_client.force_authenticate(user=customer)
    response = api_client.get("/v1/accounts/users/")
    assert response.status_code == status.HTTP_200_OK


def test_create_unauthenticated(api_client):
    response = api_client.post("/v1/accounts/users/", {"email": "new@example.com", "password": "pass"})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_create_as_admin(api_client):
    user = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.post("/v1/accounts/users/", {"name": "New User", "email": "new@example.com", "password": "pass"})

    assert response.status_code == status.HTTP_201_CREATED


def test_create_blocked_without_permission(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=customer)

    response = api_client.post("/v1/accounts/users/", {"name": "New User", "email": "new@example.com", "password": "pass"})

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_create_allowed_with_add_permission(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    customer.user_permissions.add(get_model_perm("add_user"))
    api_client.force_authenticate(user=customer)

    response = api_client.post("/v1/accounts/users/", {"name": "New User", "email": "new@example.com", "password": "pass"})

    assert response.status_code == status.HTTP_201_CREATED
