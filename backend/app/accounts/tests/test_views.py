import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.contrib.contenttypes.models import ContentType
from django.urls import reverse
from guardian.shortcuts import assign_perm, get_perms

User = get_user_model()

V1 = {"version": "v1"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_user(email, user_type, password="pass", **kwargs):
    return User.objects.create_user(email=email, password=password, type=user_type, **kwargs)


def get_model_perm(codename):
    ct = ContentType.objects.get_for_model(User)
    return Permission.objects.get(content_type=ct, codename=codename)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def admin(db):
    return User.objects.create_superuser(email="admin@example.com", password="pass", type="admin")


@pytest.fixture
def customer(db):
    return make_user("customer@example.com", "customer")


@pytest.fixture
def other_customer(db):
    return make_user("other@example.com", "customer")


# ---------------------------------------------------------------------------
# LoginView  POST /v1/auth/login/
# ---------------------------------------------------------------------------

class TestLoginView:
    url = reverse("token-obtain", kwargs=V1)

    def test_returns_tokens_on_valid_credentials(self, api_client, customer):
        res = api_client.post(self.url, {"email": "customer@example.com", "password": "pass"})
        assert res.status_code == 200
        assert "access" in res.data
        assert "refresh" in res.data

    def test_wrong_password_rejected(self, api_client, customer):
        res = api_client.post(self.url, {"email": "customer@example.com", "password": "wrong"})
        assert res.status_code == 401

    def test_unknown_email_rejected(self, api_client):
        res = api_client.post(self.url, {"email": "nobody@example.com", "password": "pass"})
        assert res.status_code == 401

    def test_missing_password_rejected(self, api_client, customer):
        res = api_client.post(self.url, {"email": "customer@example.com"})
        assert res.status_code == 400

    def test_missing_email_rejected(self, api_client):
        res = api_client.post(self.url, {"password": "pass"})
        assert res.status_code == 400

    def test_access_token_contains_role(self, api_client, customer):
        import base64, json
        res = api_client.post(self.url, {"email": "customer@example.com", "password": "pass"})
        payload = json.loads(base64.b64decode(res.data["access"].split(".")[1] + "=="))
        assert payload["role"] == "customer"

    def test_access_token_contains_name(self, api_client):
        user = make_user("named@example.com", "technician", name="Alice")
        res = api_client.post(self.url, {"email": "named@example.com", "password": "pass"})
        import base64, json
        payload = json.loads(base64.b64decode(res.data["access"].split(".")[1] + "=="))
        assert payload["name"] == "Alice"


# ---------------------------------------------------------------------------
# FirstUserView  POST /first-user/
# ---------------------------------------------------------------------------

class TestFirstUserView:
    url = reverse("first-user", kwargs=V1)

    def test_creates_first_superuser(self, api_client):
        res = api_client.post(self.url, {"name": "Admin", "email": "first@example.com", "password": "pass"})
        assert res.status_code == 201
        assert User.objects.filter(email="first@example.com", is_superuser=True).exists()
        assert "access" in res.data
        assert "refresh" in res.data

    def test_blocked_when_user_already_exists(self, api_client, customer):
        res = api_client.post(self.url, {"email": "new@example.com", "password": "pass"})
        assert res.status_code == 400


# ---------------------------------------------------------------------------
# UserListCreateView  GET/POST /users/
# ---------------------------------------------------------------------------

class TestUserListCreateView:
    url = reverse("user-list-create", kwargs=V1)

    def test_list_unauthenticated(self, api_client):
        res = api_client.get(self.url)
        assert res.status_code == 401

    def test_list_as_admin(self, api_client, admin):
        api_client.force_authenticate(user=admin)
        res = api_client.get(self.url)
        assert res.status_code == 200

    def test_list_blocked_without_permission(self, api_client, customer):
        api_client.force_authenticate(user=customer)
        res = api_client.get(self.url)
        assert res.status_code == 403

    def test_list_allowed_with_view_permission(self, api_client, customer):
        customer.user_permissions.add(get_model_perm("view_user"))
        api_client.force_authenticate(user=customer)
        res = api_client.get(self.url)
        assert res.status_code == 200

    def test_create_unauthenticated(self, api_client):
        res = api_client.post(self.url, {"email": "new@example.com", "password": "pass"})
        assert res.status_code == 401

    def test_create_as_admin(self, api_client, admin):
        api_client.force_authenticate(user=admin)
        res = api_client.post(self.url, {"name": "New User", "email": "new@example.com", "password": "pass"})
        assert res.status_code == 201

    def test_create_blocked_without_permission(self, api_client, customer):
        api_client.force_authenticate(user=customer)
        res = api_client.post(self.url, {"name": "New User", "email": "new@example.com", "password": "pass"})
        assert res.status_code == 403

    def test_create_allowed_with_add_permission(self, api_client, customer):
        customer.user_permissions.add(get_model_perm("add_user"))
        api_client.force_authenticate(user=customer)
        res = api_client.post(self.url, {"name": "New User", "email": "new@example.com", "password": "pass"})
        assert res.status_code == 201


# ---------------------------------------------------------------------------
# UserRetrieveUpdateView  GET/PATCH/DELETE /users/<pk>/
# ---------------------------------------------------------------------------

class TestUserRetrieveUpdateView:
    def url(self, pk):
        return reverse("user-detail", kwargs={"version": "v1", "pk": pk})

    def test_retrieve_unauthenticated(self, api_client, customer):
        res = api_client.get(self.url(customer.pk))
        assert res.status_code == 401

    def test_retrieve_as_admin(self, api_client, admin, customer):
        api_client.force_authenticate(user=admin)
        res = api_client.get(self.url(customer.pk))
        assert res.status_code == 200

    def test_retrieve_blocked_without_permission(self, api_client, customer, other_customer):
        api_client.force_authenticate(user=customer)
        res = api_client.get(self.url(other_customer.pk))
        assert res.status_code == 403

    def test_retrieve_allowed_with_view_object_permission(self, api_client, customer, other_customer):
        assign_perm("view_user", customer, other_customer)
        api_client.force_authenticate(user=customer)
        res = api_client.get(self.url(other_customer.pk))
        assert res.status_code == 200

    def test_patch_as_admin(self, api_client, admin, customer):
        api_client.force_authenticate(user=admin)
        res = api_client.patch(self.url(customer.pk), {"name": "Updated"})
        assert res.status_code == 200

    def test_patch_blocked_without_permission(self, api_client, customer, other_customer):
        api_client.force_authenticate(user=customer)
        res = api_client.patch(self.url(other_customer.pk), {"name": "Hacked"})
        assert res.status_code == 403

    def test_patch_allowed_with_change_object_permission(self, api_client, customer, other_customer):
        assign_perm("change_user", customer, other_customer)
        api_client.force_authenticate(user=customer)
        res = api_client.patch(self.url(other_customer.pk), {"name": "Updated"})
        assert res.status_code == 200

    def test_view_only_permission_blocks_patch(self, api_client, customer, other_customer):
        assign_perm("view_user", customer, other_customer)
        api_client.force_authenticate(user=customer)
        res = api_client.patch(self.url(other_customer.pk), {"name": "Should fail"})
        assert res.status_code == 403

    def test_delete_as_admin(self, api_client, admin, customer):
        api_client.force_authenticate(user=admin)
        res = api_client.delete(self.url(customer.pk))
        assert res.status_code == 204

    def test_delete_blocked_without_permission(self, api_client, customer, other_customer):
        api_client.force_authenticate(user=customer)
        res = api_client.delete(self.url(other_customer.pk))
        assert res.status_code == 403

    def test_delete_allowed_with_delete_object_permission(self, api_client, customer, other_customer):
        assign_perm("delete_user", customer, other_customer)
        api_client.force_authenticate(user=customer)
        res = api_client.delete(self.url(other_customer.pk))
        assert res.status_code == 204

    def test_no_cross_object_permission(self, api_client, customer, other_customer, admin):
        third = make_user("third@example.com", "customer")
        assign_perm("view_user", customer, other_customer)
        api_client.force_authenticate(user=customer)
        res = api_client.get(self.url(third.pk))
        assert res.status_code == 403


# ---------------------------------------------------------------------------
# UserPermissionsView  POST/DELETE /users/<pk>/permissions/
# ---------------------------------------------------------------------------

class TestUserPermissionsView:
    def url(self, pk):
        return reverse("user-permissions", kwargs={"version": "v1", "pk": pk})

    def test_grant_blocked_for_non_admin(self, api_client, customer, other_customer):
        api_client.force_authenticate(user=customer)
        res = api_client.post(
            self.url(other_customer.pk),
            {"user_id": customer.pk, "permissions": ["view_user"]},
            format="json",
        )
        assert res.status_code == 403

    def test_grant_permission_as_admin(self, api_client, admin, customer, other_customer):
        api_client.force_authenticate(user=admin)
        res = api_client.post(
            self.url(other_customer.pk),
            {"user_id": customer.pk, "permissions": ["view_user", "change_user"]},
            format="json",
        )
        assert res.status_code == 204
        assert set(get_perms(customer, other_customer)) == {"view_user", "change_user"}

    def test_revoke_permission_as_admin(self, api_client, admin, customer, other_customer):
        assign_perm("view_user", customer, other_customer)
        assign_perm("change_user", customer, other_customer)
        api_client.force_authenticate(user=admin)
        res = api_client.delete(
            self.url(other_customer.pk),
            {"user_id": customer.pk, "permissions": ["change_user"]},
            format="json",
        )
        assert res.status_code == 204
        assert get_perms(customer, other_customer) == ["view_user"]

    def test_grant_invalid_permission_rejected(self, api_client, admin, customer, other_customer):
        api_client.force_authenticate(user=admin)
        res = api_client.post(
            self.url(other_customer.pk),
            {"user_id": customer.pk, "permissions": ["superuser"]},
            format="json",
        )
        assert res.status_code == 400

    def test_grant_empty_permissions_rejected(self, api_client, admin, customer, other_customer):
        api_client.force_authenticate(user=admin)
        res = api_client.post(
            self.url(other_customer.pk),
            {"user_id": customer.pk, "permissions": []},
            format="json",
        )
        assert res.status_code == 400

    def test_granted_permission_enables_access(self, api_client, admin, customer, other_customer):
        api_client.force_authenticate(user=admin)
        api_client.post(
            self.url(other_customer.pk),
            {"user_id": customer.pk, "permissions": ["change_user"]},
            format="json",
        )
        api_client.force_authenticate(user=customer)
        res = api_client.patch(
            reverse("user-detail", kwargs={"version": "v1", "pk": other_customer.pk}),
            {"name": "Allowed"},
        )
        assert res.status_code == 200

    def test_revoked_permission_blocks_access(self, api_client, admin, customer, other_customer):
        assign_perm("change_user", customer, other_customer)
        api_client.force_authenticate(user=admin)
        api_client.delete(
            self.url(other_customer.pk),
            {"user_id": customer.pk, "permissions": ["change_user"]},
            format="json",
        )
        api_client.force_authenticate(user=customer)
        res = api_client.patch(
            reverse("user-detail", kwargs={"version": "v1", "pk": other_customer.pk}),
            {"name": "Blocked"},
        )
        assert res.status_code == 403
