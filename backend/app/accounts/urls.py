from django.urls import re_path
from rest_framework_simplejwt.views import TokenRefreshView

from app.accounts.token import CustomTokenObtainPairView
from app.accounts.views import (
    CustomerRegisterView,
    FirstUserView,
    NotificationListView,
    NotificationMarkAllReadView,
    NotificationMarkReadView,
    UserListCreateView,
    UserMeView,
    UserPermissionsView,
    UserRetrieveUpdateView,
)

urlpatterns = [
    re_path(r"^(?P<version>(v1))/auth/login/$", CustomTokenObtainPairView.as_view(), name="token-obtain"),
    re_path(r"^(?P<version>(v1))/auth/refresh/$", TokenRefreshView.as_view(), name="token-refresh"),
    re_path(r"^(?P<version>(v1))/accounts/users/(?P<pk>\d+)/permissions/$", UserPermissionsView.as_view(), name="user-permissions"),
    re_path(r"^(?P<version>(v1))/accounts/users/(?P<pk>\d+)/$", UserRetrieveUpdateView.as_view(), name="user-detail"),
    re_path(r"^(?P<version>(v1))/accounts/users/$", UserListCreateView.as_view(), name="user-list-create"),
    re_path(r"^(?P<version>(v1))/auth/register/$", CustomerRegisterView.as_view(), name="customer-register"),
    re_path(r"^(?P<version>(v1))/accounts/first/user/$", FirstUserView.as_view(), name="first-user"),
    re_path(r"^(?P<version>(v1))/accounts/me/$", UserMeView.as_view(), name="user-me"),
    re_path(r"^(?P<version>(v1))/accounts/notifications/read-all/$", NotificationMarkAllReadView.as_view(), name="notification-read-all"),
    re_path(r"^(?P<version>(v1))/accounts/notifications/(?P<pk>\d+)/read/$", NotificationMarkReadView.as_view(), name="notification-read"),
    re_path(r"^(?P<version>(v1))/accounts/notifications/$", NotificationListView.as_view(), name="notification-list"),
]
