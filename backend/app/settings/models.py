from django.db import models

from app.helpdesk import choices as helpdesk_choices
from app.settings import choices as settings_choices


class AppConfig(models.Model):
    app_name = models.CharField(max_length=255, unique=True)
    default_language = models.CharField(max_length=2, default=settings_choices.EN_LANGUAGE_OPTION, choices=settings_choices.LANGUAGE_CHOICES)
    default_theme = models.CharField(max_length=20, default=settings_choices.LIGHT_THEME_OPTION, choices=settings_choices.THEME_CHOICES)
    allow_customer_signup = models.BooleanField(default=False)
    logo = models.ImageField(upload_to='app_logos/', blank=True, null=True)
    email_notifications_enabled = models.BooleanField(default=False)
    notify_on_comment = models.BooleanField(default=False)
    notify_on_status_change = models.BooleanField(default=False)
    notify_on_assignment = models.BooleanField(default=False)
    auto_close_inactive_tickets = models.BooleanField(default=False)
    auto_close_after_days = models.PositiveIntegerField(default=30)
    default_ticket_priority = models.CharField(max_length=20, default=helpdesk_choices.MEDIUM_PRIORITY, choices=helpdesk_choices.PRIORITY_CHOICES)
    log_retention_days = models.PositiveIntegerField(default=90)
    step = models.CharField(max_length=20, default=settings_choices.STEP1_OPTION, choices=settings_choices.STEP_CHOICES)

    def save(self, *args, **kwargs):
        if not self.pk and AppConfig.objects.exists():
            raise ValueError("Já existe uma configuração de aplicativo. Apenas uma é permitida.")
        return super().save(*args, **kwargs)
