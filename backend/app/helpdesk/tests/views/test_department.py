from rest_framework import status

from app.accounts import choices as account_choices
from app.accounts.tests.factories import UserFactory
from app.helpdesk.tests.factories import DepartmentFactory


def test_list_unauthenticated(api_client):
    response = api_client.get("/v1/helpdesk/departments/")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_authenticated(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/departments/")

    assert response.status_code == status.HTTP_200_OK


def test_search_by_name(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    DepartmentFactory(name="Engineering")
    DepartmentFactory(name="Marketing")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/departments/?search=engine")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["name"] == "Engineering"


def test_search_by_description(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    DepartmentFactory(name="Engineering", description="Handles software projects")
    DepartmentFactory(name="Marketing", description="Manages campaigns")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/departments/?search=software")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["name"] == "Engineering"


def test_filter_by_name(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    DepartmentFactory(name="Engineering")
    DepartmentFactory(name="Marketing")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/departments/?name=engine")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["name"] == "Engineering"


def test_ordering_by_name_asc(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    DepartmentFactory(name="Zebra")
    DepartmentFactory(name="Alpha")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/departments/?ordering=name")

    assert response.status_code == status.HTTP_200_OK
    names = [d["name"] for d in response.data["results"]]
    assert names == sorted(names)


def test_ordering_by_name_desc(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    DepartmentFactory(name="Zebra")
    DepartmentFactory(name="Alpha")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/departments/?ordering=-name")

    assert response.status_code == status.HTTP_200_OK
    names = [d["name"] for d in response.data["results"]]
    assert names == sorted(names, reverse=True)


def test_invalid_ordering_returns_400(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/departments/?order=invalid_field")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
