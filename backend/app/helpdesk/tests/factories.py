import factory
from factory.django import DjangoModelFactory

from app.helpdesk import choices as helpdesk_choices
from app.helpdesk.models import Category, Department, Ticket, TicketAttachment, TicketComment


class DepartmentFactory(DjangoModelFactory):
    class Meta:
        model = Department

    name = factory.Faker("word")
    description = factory.Faker("sentence")


class CategoryFactory(DjangoModelFactory):
    class Meta:
        model = Category

    name = factory.Faker("word")
    description = factory.Faker("sentence")
    department = factory.SubFactory(DepartmentFactory)


class TicketFactory(DjangoModelFactory):
    class Meta:
        model = Ticket

    title = factory.Faker("sentence")
    description = factory.Faker("paragraph")
    category = factory.SubFactory(CategoryFactory)
    department = factory.SubFactory(DepartmentFactory)
    customer = factory.SubFactory("app.accounts.tests.factories.UserFactory")
    assigned_to = factory.SubFactory("app.accounts.tests.factories.UserFactory")
    status = factory.Iterator(helpdesk_choices.POSSIBLE_TICKET_STATUSES)
    priority = factory.Iterator(helpdesk_choices.POSSIBLE_PRIORITIES)


class TicketAttachmentFactory(DjangoModelFactory):
    class Meta:
        model = TicketAttachment

    ticket = factory.SubFactory(TicketFactory)
    file = factory.django.FileField(filename="attachment.txt")
    filename = "attachment.txt"
    content_type = "text/plain"
    size_bytes = 1024


class TicketCommentFactory(DjangoModelFactory):
    class Meta:
        model = TicketComment

    ticket = factory.SubFactory(TicketFactory)
    author = factory.SubFactory("app.accounts.tests.factories.UserFactory")
    body = factory.Faker("paragraph")
    is_private = factory.Faker("boolean")
