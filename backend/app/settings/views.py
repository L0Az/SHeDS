from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError

from app.accounts.permissions import IsAdmin
from app.settings.serializers import FirstStepConfigSerializer, SecondStepConfigSerializer, FinalStepConfigSerializer
from app.settings.models import AppConfig


class FirstStepConfigView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = FirstStepConfigSerializer
    
    def post(self, request, *args, **kwargs):
        if AppConfig.objects.exists():
            raise ValidationError("Config already exists. Only one configuration is allowed.")
        
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        
class SecondStepConfigView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = SecondStepConfigSerializer
    
    def get_object(self):
        return AppConfig.objects.first()
    
    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
        
        
class FinalStepConfigView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = FinalStepConfigSerializer
    
    def get_object(self):
        return AppConfig.objects.first()
    
    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)