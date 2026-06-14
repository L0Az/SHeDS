import factory
from factory.django import DjangoModelFactory

from app.accounts import choices as account_choices
from app.accounts.models import User, UserNotifications


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User

    name = factory.Faker("name")
    email = factory.Faker("email")
    phone = factory.Faker("phone_number")
    language = factory.Iterator(account_choices.POSSIBLE_LANGUAGES)
    type = factory.Iterator(account_choices.POSSIBLE_USER_TYPES)
    department = factory.SubFactory("app.helpdesk.tests.factories.DepartmentFactory")

    @factory.post_generation
    def password(self, create, extracted):
        if extracted:
            self.set_password(extracted)
            if create:
                self.save()


class UserNotificationsFactory(DjangoModelFactory):
    class Meta:
        model = UserNotifications

    user = factory.SubFactory(UserFactory)
    kind = factory.Iterator(account_choices.POSSIBLE_NOTIFICATION_KINDS)
    content = factory.Faker("sentence")
