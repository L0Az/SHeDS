from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from app.accounts.models import User, UserNotifications


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "phone", "department", "language", "type"]
        
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


VALID_USER_PERMISSIONS = ["view_user", "change_user", "delete_user"]


class UserPermissionSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    permissions = serializers.ListField(
        child=serializers.ChoiceField(choices=VALID_USER_PERMISSIONS),
        min_length=1,
    )