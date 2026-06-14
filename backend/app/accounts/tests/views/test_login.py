import base64
import json

from rest_framework import status

from app.accounts import choices as account_choices
from app.accounts.tests.factories import UserFactory


def test_returns_tokens_on_valid_credentials(api_client):
    UserFactory(email="customer@example.com", password="pass")

    response = api_client.post("/v1/auth/login/", {"email": "customer@example.com", "password": "pass"})

    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data
    assert "refresh" in response.data


def test_wrong_password_rejected(api_client):
    UserFactory(email="customer@example.com", password="pass")

    response = api_client.post("/v1/auth/login/", {"email": "customer@example.com", "password": "wrong"})

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_unknown_email_rejected(api_client):
    UserFactory(email="customer@example.com", password="pass")

    response = api_client.post("/v1/auth/login/", {"email": "nobody@example.com", "password": "pass"})

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_missing_password_rejected(api_client):
    UserFactory(email="customer@example.com", password="pass")

    response = api_client.post("/v1/auth/login/", {"email": "customer@example.com"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_missing_email_rejected(api_client):
    UserFactory(email="customer@example.com", password="pass")

    response = api_client.post("/v1/auth/login/", {"password": "pass"})

    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_access_token_contains_role(api_client):
    UserFactory(email="customer@example.com", password="pass", type=account_choices.CUSTOMER_USER_TYPE)

    response = api_client.post("/v1/auth/login/", {"email": "customer@example.com", "password": "pass"})

    payload = json.loads(base64.b64decode(response.data["access"].split(".")[1] + "=="))

    assert response.status_code == status.HTTP_200_OK
    assert payload["role"] == account_choices.CUSTOMER_USER_TYPE


def test_access_token_contains_name(api_client):
    UserFactory(name="Alice", email="named@example.com", password="pass")

    response = api_client.post("/v1/auth/login/", {"email": "named@example.com", "password": "pass"})

    payload = json.loads(base64.b64decode(response.data["access"].split(".")[1] + "=="))

    assert response.status_code == status.HTTP_200_OK
    assert payload["name"] == "Alice"
