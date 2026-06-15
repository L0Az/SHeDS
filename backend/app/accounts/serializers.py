from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from app.accounts import choices as account_choices
from app.accounts.models import User
from app.helpdesk.models import Department


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    name = serializers.CharField(required=True)
    email = serializers.EmailField(required=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False, allow_null=True)
    language = serializers.ChoiceField(choices=account_choices.LANGUAGE_CHOICES, required=False)
    type = serializers.ChoiceField(choices=account_choices.USER_TYPE_CHOICES, required=False)

    class Meta:
        model = User
        fields = ["id", "name", "email", "password", "phone", "department", "language", "type"]

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = super().create(validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user

    def validate_email(self, value):
        if self.instance and self.instance.email == value:
            return value
        if User.objects.filter(email__iexact=value).exists():
            raise ValidationError("E-mail already in use.")
        return value


class AdminUserSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["is_staff", "is_superuser"]


class UserMeSerializer(UserSerializer):
    permissions = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ["permissions"]

    def get_permissions(self, obj):
        return list(obj.user_permissions.filter(codename__in=VALID_PERMISSIONS).values_list("codename", flat=True))


VALID_PERMISSIONS = [
    "view_user",
    "add_user",
    "change_user",
    "delete_user",
    "view_department",
    "add_department",
    "change_department",
    "delete_department",
    "view_category",
    "add_category",
    "change_category",
    "delete_category",
    "view_ticket",
    "add_ticket",
    "change_ticket",
    "delete_ticket",
    "view_ticketcomment",
    "add_ticketcomment",
    "change_ticketcomment",
    "delete_ticketcomment",
    "view_ticketattachment",
    "add_ticketattachment",
    "change_ticketattachment",
    "delete_ticketattachment",
]


class UserPermissionSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=VALID_PERMISSIONS),
        min_length=1,
    )
