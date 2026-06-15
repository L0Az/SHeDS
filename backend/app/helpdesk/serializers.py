from app.accounts.models import User
from rest_framework import serializers

from app.accounts import choices as accounts_choices
from app.helpdesk.models import Category, Department, Ticket, TicketAttachment, TicketComment


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "description", "created_at", "updated_at"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description", "department", "created_at", "updated_at"]


class TicketAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketAttachment
        fields = ["id", "ticket", "comment", "file_url", "original_filename", "content_type", "size_bytes", "uploaded_by", "created_at"]
        read_only_fields = ["id", "ticket", "uploaded_by", "created_at"]


class TicketCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = TicketComment
        fields = ["id", "ticket", "author", "author_name", "body", "is_private", "created_at"]
        read_only_fields = ["id", "ticket", "author", "author_name", "created_at"]

    def get_author_name(self, obj) -> str:
        return obj.author.name or obj.author.email or ""

    def create(self, validated_data):
        author = self.context["request"].user
        validated_data["author"] = author
        return super().create(validated_data)

    def validate(self, data):
        user = self.context["request"].user
        if user.type == accounts_choices.CUSTOMER_USER_TYPE and data.get("is_private", False):
            raise serializers.ValidationError("Clients cannot create private comments.")
        return data


class AssigneeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "email", "type"]


class TicketSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(required=False, queryset=User.objects.filter(type=accounts_choices.CUSTOMER_USER_TYPE))
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Ticket
        fields = ["id", "title", "description", "category", "department", "customer", "assigned_to", "assigned_to_name", "status", "priority", "closed_at", "created_at", "updated_at"]
        read_only_fields = ["id", "customer", "assigned_to_name", "closed_at", "created_at", "updated_at"]

    def get_assigned_to_name(self, obj) -> str | None:
        if obj.assigned_to:
            return obj.assigned_to.name or obj.assigned_to.email or ""
        return None

    def validate_assigned_to(self, value):
        if value is None:
            return value
        request = self.context.get("request")
        if not request:
            return value
        user = request.user
        if user.type == accounts_choices.CUSTOMER_USER_TYPE:
            raise serializers.ValidationError("Customers cannot assign tickets.")
        if value.type not in (accounts_choices.ADMIN_USER_TYPE, accounts_choices.TECHNICIAN_USER_TYPE):
            raise serializers.ValidationError("Only admins and technicians can be assigned to tickets.")
        if user.type == accounts_choices.TECHNICIAN_USER_TYPE:
            if value.type != accounts_choices.TECHNICIAN_USER_TYPE:
                raise serializers.ValidationError("Technicians can only assign other technicians.")
            if value.department_id != user.department_id:
                raise serializers.ValidationError("Technicians can only assign technicians from their own department.")
        return value
