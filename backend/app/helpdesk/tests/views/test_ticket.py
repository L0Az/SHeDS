from rest_framework import status

from app.accounts import choices as account_choices
from app.accounts.tests.factories import UserFactory
from app.helpdesk import choices as helpdesk_choices
from app.helpdesk.tests.factories import CategoryFactory, DepartmentFactory, TicketFactory


def test_list_unauthenticated(api_client):
    response = api_client.get("/v1/helpdesk/tickets/")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_list_authenticated(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    TicketFactory.create_batch(3)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/tickets/")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 3


def test_search_by_title(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    TicketFactory(title="Printer is broken")
    TicketFactory(title="VPN not connecting")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/tickets/?search=printer")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["title"] == "Printer is broken"


def test_search_by_description(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    TicketFactory(title="A", description="Office printer jam")
    TicketFactory(title="B", description="Remote access problem")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/tickets/?search=printer")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["title"] == "A"


def test_filter_by_status(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    TicketFactory(status=helpdesk_choices.OPEN_TICKET_STATUS)
    TicketFactory(status=helpdesk_choices.CLOSED_TICKET_STATUS)
    api_client.force_authenticate(user=user)

    response = api_client.get(f"/v1/helpdesk/tickets/?status={helpdesk_choices.OPEN_TICKET_STATUS}")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["status"] == helpdesk_choices.OPEN_TICKET_STATUS


def test_filter_by_priority(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    TicketFactory(priority=helpdesk_choices.HIGH_PRIORITY)
    TicketFactory(priority=helpdesk_choices.LOW_PRIORITY)
    api_client.force_authenticate(user=user)

    response = api_client.get(f"/v1/helpdesk/tickets/?priority={helpdesk_choices.HIGH_PRIORITY}")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["priority"] == helpdesk_choices.HIGH_PRIORITY


def test_filter_by_department(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    dept_a = DepartmentFactory()
    dept_b = DepartmentFactory()
    TicketFactory(department=dept_a)
    TicketFactory(department=dept_b)
    api_client.force_authenticate(user=user)

    response = api_client.get(f"/v1/helpdesk/tickets/?department={dept_a.pk}")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["department"] == dept_a.pk


def test_filter_by_category(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    cat_a = CategoryFactory()
    cat_b = CategoryFactory()
    TicketFactory(category=cat_a)
    TicketFactory(category=cat_b)
    api_client.force_authenticate(user=user)

    response = api_client.get(f"/v1/helpdesk/tickets/?category={cat_a.pk}")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["category"] == cat_a.pk


def test_filter_by_customer(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    other = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    TicketFactory(customer=user)
    TicketFactory(customer=other)
    api_client.force_authenticate(user=user)

    response = api_client.get(f"/v1/helpdesk/tickets/?customer={user.pk}")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["customer"] == user.pk


def test_filter_by_assigned_to(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    agent_a = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    agent_b = UserFactory(type=account_choices.ADMIN_USER_TYPE)
    TicketFactory(assigned_to=agent_a)
    TicketFactory(assigned_to=agent_b)
    api_client.force_authenticate(user=user)

    response = api_client.get(f"/v1/helpdesk/tickets/?assigned_to={agent_a.pk}")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 1
    assert response.data["results"][0]["assigned_to"] == agent_a.pk


def test_ordering_by_title_asc(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    TicketFactory(title="Zebra issue")
    TicketFactory(title="Alpha issue")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/tickets/?ordering=title")

    assert response.status_code == status.HTTP_200_OK
    titles = [t["title"] for t in response.data["results"]]
    assert titles == sorted(titles)


def test_ordering_by_title_desc(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    TicketFactory(title="Zebra issue")
    TicketFactory(title="Alpha issue")
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/tickets/?ordering=-title")

    assert response.status_code == status.HTTP_200_OK
    titles = [t["title"] for t in response.data["results"]]
    assert titles == sorted(titles, reverse=True)


def test_ordering_by_created_at(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    TicketFactory.create_batch(3)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/tickets/?ordering=created_at")

    assert response.status_code == status.HTTP_200_OK
    dates = [t["created_at"] for t in response.data["results"]]
    assert dates == sorted(dates)


def test_invalid_ordering_returns_400(api_client):
    user = UserFactory(type=account_choices.CUSTOMER_USER_TYPE)
    api_client.force_authenticate(user=user)

    response = api_client.get("/v1/helpdesk/tickets/?order=invalid_field")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
