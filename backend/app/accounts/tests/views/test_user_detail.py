from guardian.shortcuts import assign_perm
from rest_framework import status

from app.accounts import choices as account_choices
from app.accounts.tests.factories import UserFactory


def test_retrieve_unauthenticated(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)

    response = api_client.get(f"/v1/accounts/users/{customer.pk}/")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_retrieve_as_admin(api_client):
    admin = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=admin)

    response = api_client.get(f"/v1/accounts/users/{customer.pk}/")

    assert response.status_code == status.HTTP_200_OK


def test_retrieve_blocked_without_permission(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=customer)

    response = api_client.get(f"/v1/accounts/users/{other_customer.pk}/")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_retrieve_allowed_with_view_object_permission(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    assign_perm("view_user", customer, other_customer)

    api_client.force_authenticate(user=customer)

    response = api_client.get(f"/v1/accounts/users/{other_customer.pk}/")
    assert response.status_code == status.HTTP_200_OK


def test_patch_as_admin(api_client):
    admin = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=admin)

    response = api_client.patch(f"/v1/accounts/users/{customer.pk}/", {"name": "Updated"})

    assert response.status_code == status.HTTP_200_OK


def test_patch_blocked_without_permission(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=customer)

    response = api_client.patch(f"/v1/accounts/users/{other_customer.pk}/", {"name": "Hacked"})

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_patch_allowed_with_change_object_permission(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    assign_perm("change_user", customer, other_customer)
    api_client.force_authenticate(user=customer)

    response = api_client.patch(f"/v1/accounts/users/{other_customer.pk}/", {"name": "Updated"})

    assert response.status_code == status.HTTP_200_OK


def test_view_only_permission_blocks_patch(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    assign_perm("view_user", customer, other_customer)
    api_client.force_authenticate(user=customer)

    response = api_client.patch(f"/v1/accounts/users/{other_customer.pk}/", {"name": "Should fail"})

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_as_admin(api_client):
    admin = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=admin)

    response = api_client.delete(f"/v1/accounts/users/{customer.pk}/")

    assert response.status_code == status.HTTP_204_NO_CONTENT


def test_delete_blocked_without_permission(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=customer)

    response = api_client.delete(f"/v1/accounts/users/{other_customer.pk}/")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_delete_allowed_with_delete_object_permission(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    assign_perm("delete_user", customer, other_customer)
    api_client.force_authenticate(user=customer)

    response = api_client.delete(f"/v1/accounts/users/{other_customer.pk}/")

    assert response.status_code == status.HTTP_204_NO_CONTENT


def test_no_cross_object_permission(api_client):
    third = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    assign_perm("view_user", customer, other_customer)
    api_client.force_authenticate(user=customer)

    response = api_client.get(f"/v1/accounts/users/{third.pk}/")

    assert response.status_code == status.HTTP_403_FORBIDDEN
