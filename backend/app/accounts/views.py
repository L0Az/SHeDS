from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from guardian.shortcuts import assign_perm, remove_perm
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from app.accounts.filters import UserFilter
from app.accounts.models import User
from app.accounts.permissions import AdminOrModelPermissions, AdminOrObjectPermissions, IsAdmin
from app.accounts.serializers import VALID_PERMISSIONS, UserMeSerializer, UserPermissionSerializer, UserSerializer
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
        grantee = get_user(serializer.validated_data["user_id"])
        for perm in serializer.validated_data["permissions"]:
            assign_perm(perm, grantee, target)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, pk, **kwargs):
        target = get_user(pk)
        serializer = UserPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        grantee = get_user(serializer.validated_data["user_id"])
        for perm in serializer.validated_data["permissions"]:
            remove_perm(perm, grantee, target)
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


class UserMeView(generics.RetrieveAPIView):
    serializer_class = UserMeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user
