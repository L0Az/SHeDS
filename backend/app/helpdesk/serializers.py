from rest_framework import serializers

from app.accounts import choices as accounts_choices
from app.helpdesk.models import Category, Department, Ticket, TicketAttachment, TicketComment


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "description"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "description", "department"]


class TicketAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketAttachment
        fields = ["id", "ticket", "comment", "file_url", "original_filename", "content_type", "size_bytes", "uploaded_by", "created_at"]
        read_only_fields = ["id", "ticket", "uploaded_by", "created_at"]


class TicketCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketComment
        fields = ["id", "ticket", "author", "body", "is_private"]

    def create(self, validated_data):
        author = self.context["request"].user
        validated_data["author"] = author
        comment = super().create(validated_data)

        return comment

    def validate(self, data):
        user = self.context["request"].user
        if user.user_type == accounts_choices.CUSTOMER_USER_TYPE and data.get("is_private", False):
            raise serializers.ValidationError("Clients cannot create private comments.")
        return data


class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ["id", "title", "description", "category", "department", "customer", "assigned_to", "status", "priority", "closed_at", "created_at"]
