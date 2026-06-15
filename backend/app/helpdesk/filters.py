from django_filters import rest_framework as filters

from app.helpdesk.models import Category, Department, Ticket


class DepartmentFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = Department
        fields = ["name"]


class CategoryFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr="icontains")
    department = filters.NumberFilter(field_name="department__id")
    department_name = filters.CharFilter(field_name="department__name", lookup_expr="iexact")

    class Meta:
        model = Category
        fields = ["name", "department", "department_name"]


class TicketFilter(filters.FilterSet):
    title = filters.CharFilter(field_name="title", lookup_expr="icontains")
    status = filters.CharFilter(field_name="status", lookup_expr="iexact")
    priority = filters.CharFilter(field_name="priority", lookup_expr="iexact")
    department = filters.NumberFilter(field_name="department__id")
    category = filters.NumberFilter(field_name="category__id")
    customer = filters.NumberFilter(field_name="customer__id")
    assigned_to = filters.NumberFilter(field_name="assigned_to__id")

    class Meta:
        model = Ticket
        fields = ["title", "status", "priority", "department", "category", "customer", "assigned_to"]
