from guardian.shortcuts import assign_perm, get_perms
from rest_framework import status

from app.accounts import choices as account_choices
from app.accounts.tests.factories import UserFactory


def test_grant_blocked_for_non_admin(api_client):
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=customer)

    response = api_client.post(
        f"/v1/accounts/users/{other_customer.pk}/permissions/",
        {"user_id": customer.pk, "permissions": ["view_user"]},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_grant_permission_as_admin(api_client):
    admin = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=admin)

    response = api_client.post(
        f"/v1/accounts/users/{other_customer.pk}/permissions/",
        {"user_id": customer.pk, "permissions": ["view_user", "change_user"]},
        format="json",
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert set(get_perms(customer, other_customer)) == {"view_user", "change_user"}


def test_revoke_permission_as_admin(api_client):
    admin = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    assign_perm("view_user", customer, other_customer)
    assign_perm("change_user", customer, other_customer)
    api_client.force_authenticate(user=admin)

    response = api_client.delete(
        f"/v1/accounts/users/{other_customer.pk}/permissions/",
        {"user_id": customer.pk, "permissions": ["change_user"]},
        format="json",
    )

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert get_perms(customer, other_customer) == ["view_user"]


def test_grant_invalid_permission_rejected(api_client):
    admin = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=admin)

    response = api_client.post(
        f"/v1/accounts/users/{other_customer.pk}/permissions/",
        {"user_id": customer.pk, "permissions": ["superuser"]},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_grant_empty_permissions_rejected(api_client):
    admin = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=admin)

    response = api_client.post(
        f"/v1/accounts/users/{other_customer.pk}/permissions/",
        {"user_id": customer.pk, "permissions": []},
        format="json",
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_granted_permission_enables_access(api_client):
    admin = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=admin)

    api_client.post(
        f"/v1/accounts/users/{other_customer.pk}/permissions/",
        {"user_id": customer.pk, "permissions": ["change_user"]},
        format="json",
    )

    api_client.force_authenticate(user=customer)

    response = api_client.patch(
        f"/v1/accounts/users/{other_customer.pk}/",
        {"name": "Allowed"},
    )

    assert response.status_code == status.HTTP_200_OK


def test_revoked_permission_blocks_access(api_client):
    admin = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other_customer = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    assign_perm("change_user", customer, other_customer)
    api_client.force_authenticate(user=admin)

    api_client.delete(
        f"/v1/accounts/users/{other_customer.pk}/permissions/",
        {"user_id": customer.pk, "permissions": ["change_user"]},
        format="json",
    )

    api_client.force_authenticate(user=customer)

    response = api_client.patch(
        f"/v1/accounts/users/{other_customer.pk}/",
        {"name": "Blocked"},
    )

    assert response.status_code == status.HTTP_403_FORBIDDEN
