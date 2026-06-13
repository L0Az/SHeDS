from django.urls import path

from app.accounts.views import (
    FirstUserView,
    UserListCreateView,
    UserPermissionsView,
    UserRetrieveUpdateView,
)

urlpatterns = [
    path("users/", UserListCreateView.as_view(), name="user-list-create"),
    path("users/<int:pk>/", UserRetrieveUpdateView.as_view(), name="user-detail"),
    path("users/<int:pk>/permissions/", UserPermissionsView.as_view(), name="user-permissions"),
    path("first-user/", FirstUserView.as_view(), name="first-user"),
]
