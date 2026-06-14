from django.urls import re_path
from rest_framework_simplejwt.views import TokenRefreshView

from app.accounts.token import CustomTokenObtainPairView
from app.accounts.views import (
    FirstUserView,
    UserListCreateView,
    UserPermissionsView,
    UserRetrieveUpdateView,
)

urlpatterns = [
    re_path(r"^(?P<version>(v1))/auth/login/$", CustomTokenObtainPairView.as_view(), name="token-obtain"),
    re_path(r"^(?P<version>(v1))/auth/refresh/$", TokenRefreshView.as_view(), name="token-refresh"),
    re_path(r"^(?P<version>(v1))/users/(?P<pk>\d+)/permissions/$", UserPermissionsView.as_view(), name="user-permissions"),
    re_path(r"^(?P<version>(v1))/users/(?P<pk>\d+)/$", UserRetrieveUpdateView.as_view(), name="user-detail"),
    re_path(r"^(?P<version>(v1))/users/$", UserListCreateView.as_view(), name="user-list-create"),
    re_path(r"^(?P<version>(v1))/first/user/$", FirstUserView.as_view(), name="first-user"),
]
