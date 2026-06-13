from django.utils import timezone

from rest_framework import generics, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from app.accounts.models import User
from app.accounts import choices as accounts_choices
from app.accounts.serializers import UserSerializer
from app.common.order import OrderMixin
from app.accounts.services.user import get_user

class UserListCreateView(OrderMixin, generics.ListCreateAPIView):
    serializer_class = UserSerializer
    
    def get_queryset(self):
        return User.objects.all()
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        

class UserRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    
    def get_object(self):
        user_id = self.kwargs.get("pk")
        return get_user(user_id)
    
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
    
    
class FirstUserView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        if User.objects.exists():
            raise ValidationError("A user already exists.")
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            User.objects.create_superuser(**serializer.validated_data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)