from rest_framework import status

from app.accounts import choices as account_choices
from app.accounts.tests.factories import UserFactory
from app.helpdesk.tests.factories import CategoryFactory, DepartmentFactory


def test_list_unauthenticated(api_client):
    response = api_client.get("/v1/helpdesk/categories/")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_authenticated(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    CategoryFactory.create_batch(3)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/categories/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 3


def test_search_by_name(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    CategoryFactory(name="Hardware failure")
    CategoryFactory(name="Software install")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/categories/?search=hardware")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["name"] == "Hardware failure"


def test_search_by_description(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    CategoryFactory(name="A", description="Covers network issues")
    CategoryFactory(name="B", description="Covers printing issues")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/categories/?search=network")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["name"] == "A"


def test_filter_by_name(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    CategoryFactory(name="Hardware failure")
    CategoryFactory(name="Software install")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/categories/?name=hardware")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["name"] == "Hardware failure"


def test_filter_by_department_id(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    dept_a = DepartmentFactory()
    dept_b = DepartmentFactory()
    CategoryFactory(department=dept_a)
    CategoryFactory(department=dept_b)
    api_client.force_authenticate(user=user)

    response = api_client.get(f"/v1/helpdesk/categories/?department={dept_a.pk}")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["department"] == dept_a.pk


def test_filter_by_department_name(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    dept_a = DepartmentFactory(name="Engineering")
    dept_b = DepartmentFactory(name="Marketing")
    CategoryFactory(department=dept_a)
    CategoryFactory(department=dept_b)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/categories/?department_name=Engineering")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["department"] == dept_a.pk


def test_ordering_by_name_asc(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    CategoryFactory(name="Zebra")
    CategoryFactory(name="Alpha")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/categories/?ordering=name")

    assert response.status_code == status.HTTP_200_OK
    names = [c["name"] for c in response.data["results"]]
    assert names == sorted(names)


def test_ordering_by_name_desc(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    CategoryFactory(name="Zebra")
    CategoryFactory(name="Alpha")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/categories/?ordering=-name")

    assert response.status_code == status.HTTP_200_OK
    names = [c["name"] for c in response.data["results"]]
    assert names == sorted(names, reverse=True)


def test_invalid_ordering_returns_400(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/categories/?order=invalid_field")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
