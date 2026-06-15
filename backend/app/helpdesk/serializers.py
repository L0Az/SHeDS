from app.accounts.models import User
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


class TicketSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(required=False, queryset=User.objects.filter(type=accounts_choices.CUSTOMER_USER_TYPE))
    
    class Meta:
        model = Ticket
        fields = ["id", "title", "description", "category", "department", "customer", "assigned_to", "status", "priority", "closed_at", "created_at", "updated_at"]
