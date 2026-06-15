from django_filters import rest_framework as filters

from app.accounts.models import User


class UserFilter(filters.FilterSet):
    name = filters.CharFilter(field_name="name", lookup_expr="icontains")
    email = filters.CharFilter(field_name="email", lookup_expr="icontains")
    type = filters.CharFilter(field_name="type", lookup_expr="iexact")
    department = filters.CharFilter(field_name="department__name", lookup_expr="iexact")

    class Meta:
        model = User
        fields = ["name", "email", "type", "department"]
