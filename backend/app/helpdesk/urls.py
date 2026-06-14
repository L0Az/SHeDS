from django.urls import re_path

from app.helpdesk.views import DepartmentView, CategoryView, TicketView, DepartmentDetailView, CategoryDetailView, TicketDetailView

urlpatterns = [
    re_path(r"^(?P<version>(v1))/helpdesk/departments/", DepartmentView.as_view(), name="department-list-create"),
    re_path(r"^(?P<version>(v1))/helpdesk/departments/(?P<pk>\d+)/", DepartmentDetailView.as_view(), name="department-detail"),
    re_path(r"^(?P<version>(v1))/helpdesk/categories/", CategoryView.as_view(), name="category-list-create"),
    re_path(r"^(?P<version>(v1))/helpdesk/categories/(?P<pk>\d+)/", CategoryDetailView.as_view(), name="category-detail"),
    re_path(r"^(?P<version>(v1))/helpdesk/tickets/", TicketView.as_view(), name="ticket-list-create"),
    re_path(r"^(?P<version>(v1))/helpdesk/tickets/(?P<pk>\d+)/", TicketDetailView.as_view(), name="ticket-detail"),
]