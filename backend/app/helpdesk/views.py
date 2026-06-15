from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from app.accounts.permissions import AdminOrModelPermissions
from app.common.order import OrderMixin
from app.helpdesk.filters import CategoryFilter, DepartmentFilter, TicketFilter
from app.helpdesk.models import Category, Department, Ticket, TicketAttachment
from app.helpdesk.serializers import CategorySerializer, DepartmentSerializer, TicketAttachmentSerializer, TicketCommentSerializer, TicketSerializer
from app.helpdesk.services.attachment import delete_by_url, presign_upload
from app.helpdesk.services.category import get_category
from app.helpdesk.services.department import get_department
from app.helpdesk.services.ticket import get_ticket


class DepartmentView(OrderMixin, generics.ListCreateAPIView):
    serializer_class = DepartmentSerializer
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_class = DepartmentFilter
    search_fields = ["name", "description"]
    ordering_fields = ["id", "name"]

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


class CategoryView(OrderMixin, generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_class = CategoryFilter
    search_fields = ["name", "description"]
    ordering_fields = ["id", "name", "department__name"]

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


class TicketView(OrderMixin, generics.ListCreateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = (DjangoFilterBackend, SearchFilter, OrderingFilter)
    filterset_class = TicketFilter
    search_fields = ["title", "description"]
    ordering_fields = ["id", "title", "status", "priority", "created_at"]

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


class PresignAttachmentView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        filename = request.data.get("filename", "file")
        try:
            result = presign_upload(str(filename))
        except Exception as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        return Response(result)


class AttachmentInTicketView(generics.ListCreateAPIView):
    serializer_class = TicketAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ticket_id = self.kwargs.get("ticket_pk")
        return TicketAttachment.objects.filter(ticket_id=ticket_id).order_by("created_at")

    def post(self, request, *args, **kwargs):
        ticket_id = self.kwargs.get("ticket_pk")
        ticket = get_ticket(ticket_id)
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid(raise_exception=True):
            serializer.save(ticket=ticket, uploaded_by=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class AttachmentDetailView(generics.DestroyAPIView):
    serializer_class = TicketAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        ticket_id = self.kwargs.get("ticket_pk")
        pk = self.kwargs.get("pk")
        return generics.get_object_or_404(TicketAttachment, pk=pk, ticket_id=ticket_id)

    def delete(self, request, *args, **kwargs):
        instance = self.get_object()
        delete_by_url(instance.file_url)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
