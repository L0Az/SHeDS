from django.urls import re_path

from app.settings.views import FirstStepConfigView, SecondStepConfigView, FinalStepConfigView

urlpatterns = [
    re_path(r"^(?P<version>(v1))/settings/first/step/", FirstStepConfigView.as_view(), name="settings-first-step"),
    re_path(r"^(?P<version>(v1))/settings/second/step/", SecondStepConfigView.as_view(), name="settings-second-step"),
    re_path(r"^(?P<version>(v1))/settings/final/step/", FinalStepConfigView.as_view(), name="settings-final-step"),
]