from django.urls import re_path

from app.helpdesk.views import DepartmentView, CategoryView, TicketView, DepartmentDetailView, CategoryDetailView, TicketDetailView

urlpatterns = [
    re_path(r"^(?P<version>(v1))/departments/", DepartmentView.as_view(), name="department-list-create"),
    re_path(r"^(?P<version>(v1))/departments/(?P<pk>\d+)/", DepartmentDetailView.as_view(), name="department-detail"),
    re_path(r"^(?P<version>(v1))/categories/", CategoryView.as_view(), name="category-list-create"),
    re_path(r"^(?P<version>(v1))/categories/(?P<pk>\d+)/", CategoryDetailView.as_view(), name="category-detail"),
    re_path(r"^(?P<version>(v1))/tickets/", TicketView.as_view(), name="ticket-list-create"),
    re_path(r"^(?P<version>(v1))/tickets/(?P<pk>\d+)/", TicketDetailView.as_view(), name="ticket-detail"),
]