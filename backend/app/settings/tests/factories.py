import factory
from factory.django import DjangoModelFactory

from app.helpdesk import choices as helpdesk_choices
from app.settings import choices as settings_choices
from app.settings.models import AppConfig


class AppConfigFactory(DjangoModelFactory):
    class Meta:
        model = AppConfig

    app_name = factory.Faker("company")
    oci_bucket_name = factory.Faker("word")
    oci_bucket_namespace = factory.Faker("word")
    oci_sender_email = factory.Faker("email")
    default_language = factory.Iterator(settings_choices.POSSIBLE_LANGUAGES)
    default_theme = factory.Iterator(settings_choices.POSSIBLE_THEMES)
    allow_customer_signup = factory.Faker("boolean")
    email_notifications_enabled = factory.Faker("boolean")
    notify_on_comment = factory.Faker("boolean")
    notify_on_status_change = factory.Faker("boolean")
    notify_on_assignment = factory.Faker("boolean")
    auto_close_inactive_tickets = factory.Faker("boolean")
    auto_close_after_days = factory.Faker("random_int", min=1, max=365)
    default_ticket_priority = factory.Iterator(helpdesk_choices.POSSIBLE_PRIORITIES)
    log_retention_days = factory.Faker("random_int", min=1, max=365)
    step = factory.Iterator(settings_choices.POSSIBLE_STEPS)
