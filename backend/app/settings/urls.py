from django.urls import re_path

from app.settings.views import AppConfigView, FinalStepConfigView, FirstStepConfigView, PublicAppConfigView, SecondStepConfigView, VerifySetupView

urlpatterns = [
    re_path(r"^(?P<version>(v1))/settings/public/$", PublicAppConfigView.as_view(), name="settings-public"),
    re_path(r"^(?P<version>(v1))/settings/verify/$", VerifySetupView.as_view(), name="settings"),
    re_path(r"^(?P<version>(v1))/settings/first/step/", FirstStepConfigView.as_view(), name="settings-first-step"),
    re_path(r"^(?P<version>(v1))/settings/second/step/", SecondStepConfigView.as_view(), name="settings-second-step"),
    re_path(r"^(?P<version>(v1))/settings/final/step/", FinalStepConfigView.as_view(), name="settings-final-step"),
    re_path(r"^(?P<version>(v1))/settings/app/", AppConfigView.as_view(), name="settings-app-config"),
]
