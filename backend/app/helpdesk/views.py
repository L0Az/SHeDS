from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from app.accounts.permissions import AdminOrModelPermissions
from app.helpdesk.models import Category, Department, Ticket
from app.helpdesk.serializers import CategorySerializer, DepartmentSerializer, TicketAttachmentSerializer, TicketCommentSerializer, TicketSerializer
from app.helpdesk.services.department import get_department
from app.helpdesk.services.category import get_category
from app.helpdesk.services.ticket import get_ticket


class DepartmentView(generics.ListCreateAPIView):
    serializer_class = DepartmentSerializer
    
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), AdminOrModelPermissions()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        return Department.objects.all()
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        
class DepartmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DepartmentSerializer
    
    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAuthenticated(), AdminOrModelPermissions()]
        return [IsAuthenticated()]
    
    def get_object(self):
        department_id = self.kwargs.get("pk")
        return get_department(department_id)
    
    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
        
    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    

class CategoryView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    
    def get_permissions(self):
        if self.request.method == "POST":
            return [IsAuthenticated(), AdminOrModelPermissions()]
        return [IsAuthenticated()]
    
    def get_queryset(self):
        return Category.objects.all()
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        
class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    
    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsAuthenticated(), AdminOrModelPermissions()]
        return [IsAuthenticated()]
    
    def get_object(self):
        category_id = self.kwargs.get("pk")
        return get_category(category_id)
    
    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
        
    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    

class TicketView(generics.ListCreateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Ticket.objects.select_related('department', 'category', 'customer', 'assigned_to').all()
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save(customer=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        

class TicketDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    
    def get_object(self):
        ticket_id = self.kwargs.get("pk")
        return get_ticket(ticket_id)
    
    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        if serializer.is_valid(raise_exception=True):
            serializer.save()
            return Response(serializer.data)
        
    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    
class CommentInTicketView(generics.CreateAPIView):
    serializer_class = TicketCommentSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        ticket_id = self.kwargs.get("ticket_pk")
        ticket = get_ticket(ticket_id)
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save(author=request.user, ticket=ticket)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        
class AttachmentInTicketView(generics.CreateAPIView):
    serializer_class = TicketAttachmentSerializer
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        ticket_id = self.kwargs.get("ticket_pk")
        ticket = get_ticket(ticket_id)
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer["uploaded_by"] = request.user
            serializer.save(ticket=ticket)
            return Response(serializer.data, status=status.HTTP_201_CREATED)