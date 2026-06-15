import logging

from django.conf import settings as django_settings
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from app.accounts.permissions import IsAdmin
from app.settings import choices as settings_choices
from app.settings.models import AppConfig
from app.settings.serializers import AppConfigSerializer, FinalStepConfigSerializer, FirstStepConfigSerializer, PublicAppConfigSerializer, SecondStepConfigSerializer

logger = logging.getLogger(__name__)

OCI_ENV_FIELDS = [
    "oci_tenancy_ocid",
    "oci_user_ocid",
    "oci_key_fingerprint",
    "oci_region",
    "oci_compartment_ocid",
    "oci_bucket_name",
    "oci_bucket_namespace",
    "oci_sender_email",
]


def _oci_from_env() -> dict:
    return {field: getattr(django_settings, field.upper(), "") for field in OCI_ENV_FIELDS}


class PublicAppConfigView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PublicAppConfigSerializer

    def get(self, request, *args, **kwargs):
        instance = AppConfig.objects.filter(step=settings_choices.FINAL_STEP_OPTION).first()
        if not instance:
            return Response({"allow_customer_signup": False}, status=status.HTTP_200_OK)
        return Response(self.get_serializer(instance).data)


class VerifySetupView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        config_exists = AppConfig.objects.exists()
        return Response({"config_status": config_exists}, status=status.HTTP_200_OK)


class FirstStepConfigView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = FirstStepConfigSerializer

    def post(self, request, *args, **kwargs):
        if AppConfig.objects.exists():
            raise ValidationError("Config already exists. Only one configuration is allowed.")

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save(step=settings_choices.STEP2_OPTION)
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class SecondStepConfigView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = SecondStepConfigSerializer

    def get_object(self):
        return AppConfig.objects.first()

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save(step=settings_choices.STEP3_OPTION)
            return Response(serializer.data)


class FinalStepConfigView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = FinalStepConfigSerializer

    def get_object(self):
        return AppConfig.objects.first()

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save(step=settings_choices.FINAL_STEP_OPTION)
            return Response(serializer.data)


class AppConfigView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AppConfigSerializer

    def get_object(self):
        if app_config := AppConfig.objects.filter(step=settings_choices.FINAL_STEP_OPTION).first():
            return app_config
        raise NotFound("AppConfig not found or setup not completed.")

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        data = {**self.get_serializer(instance).data, **_oci_from_env()}
        return Response(data)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response({**serializer.data, **_oci_from_env()})
