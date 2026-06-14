import json
import logging

from django.conf import settings
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from app.accounts.permissions import IsAdmin
from app.settings import choices as settings_choices
from app.settings.models import AppConfig
from app.settings.passbolt import PassboltClient, PassboltError
from app.settings.serializers import AppConfigSerializer, FinalStepConfigSerializer, FirstStepConfigSerializer, SecondStepConfigSerializer

logger = logging.getLogger(__name__)


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
            serializer['step'].save(settings_choices.STEP2_OPTION)
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
            serializer['step'].save(settings_choices.STEP3_OPTION)
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
            serializer['step'].save(settings_choices.FINAL_STEP_OPTION)
            self._sync_to_passbolt(serializer.instance)
            return Response(serializer.data)

    def _sync_to_passbolt(self, config):
        if not getattr(settings, 'PASSBOLT_BASE_URL', ''):
            return

        description = json.dumps(
            {
                "tenancy_ocid": config.oci_tenancy_ocid,
                "key_fingerprint": config.oci_key_fingerprint,
                "region": config.oci_region,
                "compartment_ocid": config.oci_compartment_ocid,
                "bucket_name": config.oci_bucket_name,
                "bucket_namespace": config.oci_bucket_namespace,
                "sender_email": config.oci_sender_email,
            }
        )

        try:
            with PassboltClient() as client:
                client.authenticate()
                client.create_resource(
                    name=f"OCI Config — {config.app_name}",
                    password=config.oci_private_key or '',
                    username=config.oci_user_ocid or '',
                    uri='https://cloud.oracle.com',
                    description=description,
                )
        except PassboltError as exc:
            logger.error("Passbolt sync failed: %s", exc)
            raise ValidationError(f"OCI credentials saved but Passbolt upload failed: {exc}")


class AppConfigView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AppConfigSerializer

    def get_object(self):
        if app_config := AppConfig.objects.filter(step=settings_choices.FINAL_STEP_OPTION).first():
            return app_config
        raise NotFound("AppConfig not found or setup not completed.")

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            return Response(serializer.data)
