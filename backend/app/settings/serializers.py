from rest_framework import serializers

from app.settings.models import AppConfig


class FirstStepConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppConfig
        fields = ["app_name", "logo", "default_language", "default_theme"]


class SecondStepConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppConfig
        fields = [
            "allow_customer_signup",
            "notify_on_comment",
            "notify_on_status_change",
            "notify_on_assignment",
            "auto_close_inactive_tickets",
            "auto_close_after_days",
            "default_ticket_priority",
            "log_retention_days",
        ]


class FinalStepConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppConfig
        fields = ["email_notifications_enabled"]


class AppConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppConfig
        exclude = ["step", "logo"]


class PublicAppConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppConfig
        fields = ["app_name", "allow_customer_signup", "default_language", "default_theme", "logo"]
