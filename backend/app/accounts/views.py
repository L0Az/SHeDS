from django.contrib.auth.models import Permission
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from app.accounts.filters import UserFilter
from app.accounts.models import User, UserNotifications
from app.accounts.permissions import AdminOrModelPermissions, AdminOrObjectPermissions, IsAdmin
from app.accounts.serializers import (
    VALID_PERMISSIONS,
    CustomerRegisterSerializer,
    UserMeSerializer,
    UserNotificationSerializer,
    UserPermissionSerializer,
    UserPreferenceSerializer,
    UserSerializer,
)
from app.accounts.services.user import get_user
from app.accounts.token import CustomTokenObtainPairSerializer
from app.common.order import OrderMixin


class UserListCreateView(OrderMixin, generics.ListCreateAPIView):
    serializer_class = UserSerializer
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_class = UserFilter
    permission_classes = [IsAuthenticated, AdminOrModelPermissions]
    ordering_fields = ["id", "name", "email", "type", "department__name"]
    search_fields = ["name", "email", "type"]

    def get_queryset(self):
        return User.objects.all()

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class UserRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, AdminOrObjectPermissions]

    def get_object(self):
        user_id = self.kwargs.get("pk")
        obj = get_user(user_id)
        self.check_object_permissions(self.request, obj)
        return obj

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.email = None
        instance.phone = None
        instance.name = None
        instance.deleted_at = timezone.now()
        instance.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserPermissionsView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk, **kwargs):
        target = get_user(pk)
        current = list(target.user_permissions.filter(codename__in=VALID_PERMISSIONS).values_list("codename", flat=True))
        return Response({"permissions": current})

    def post(self, request, pk, **kwargs):
        target = get_user(pk)
        serializer = UserPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        perms = Permission.objects.filter(codename__in=serializer.validated_data["permissions"])
        target.user_permissions.add(*perms)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, **kwargs):
        target = get_user(pk)
        serializer = UserPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        perms = Permission.objects.filter(codename__in=serializer.validated_data["permissions"])
        target.user_permissions.remove(*perms)
        return Response(status=status.HTTP_204_NO_CONTENT)


class FirstUserView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        if User.objects.exists():
            raise ValidationError("A user already exists.")
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = User.objects.create_superuser(**serializer.validated_data)
            token = CustomTokenObtainPairSerializer.get_token(user)
            return Response(
                {"access": str(token.access_token), "refresh": str(token)},
                status=status.HTTP_201_CREATED,
            )


class UserMeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return UserPreferenceSerializer
        return UserMeSerializer

    def patch(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(UserMeSerializer(self.get_object(), context={"request": request}).data)


class CustomerRegisterView(generics.CreateAPIView):
    serializer_class = CustomerRegisterSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        from app.settings import choices as settings_choices
        from app.settings.models import AppConfig

        config = AppConfig.objects.filter(step=settings_choices.FINAL_STEP_OPTION).first()
        if not config or not config.allow_customer_signup:
            return Response({"detail": "Self-registration is not enabled."}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            user = serializer.save()
            token = CustomTokenObtainPairSerializer.get_token(user)
            return Response(
                {"access": str(token.access_token), "refresh": str(token)},
                status=status.HTTP_201_CREATED,
            )


class NotificationListView(generics.ListAPIView):
    serializer_class = UserNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return UserNotifications.objects.filter(user=self.request.user).order_by("-created_at")


class NotificationMarkReadView(generics.UpdateAPIView):
    serializer_class = UserNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return generics.get_object_or_404(UserNotifications, pk=self.kwargs["pk"], user=self.request.user)

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.read_at = timezone.now()
        instance.save(update_fields=["read_at"])
        return Response(self.get_serializer(instance).data)


class NotificationMarkAllReadView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        UserNotifications.objects.filter(user=request.user, read_at__isnull=True).update(read_at=timezone.now())
        return Response(status=status.HTTP_204_NO_CONTENT)
