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
            "log_retention_days"
        ]
        

class FinalStepConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppConfig
        fields = [
            "email_notifications_enabled",
            "oci_tenancy_ocid",
            "oci_user_ocid",
            "oci_key_fingerprint",
            "oci_private_key",
            "oci_region",
            "oci_compartment_ocid",
            "oci_bucket_name",
            "oci_bucket_namespace",
            "oci_sender_email"
        ]