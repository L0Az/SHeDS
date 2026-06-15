from rest_framework import serializers

from app.accounts import choices as accounts_choices
from app.accounts.models import User
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
        fields = [
            "id",
            "title",
            "description",
            "category",
            "department",
            "customer",
            "assigned_to",
            "assigned_to_name",
            "status",
            "priority",
            "closed_at",
            "created_at",
            "updated_at",
        ]
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


_TRACKED_FIELDS = ["title", "description", "status", "priority", "assigned_to_id", "category_id", "department_id", "closed_at"]


def serialize_ticket_history(history_qs):
    from app.accounts.models import User

    entries = list(history_qs.select_related("history_user").order_by("-history_date"))

    user_ids, category_ids, department_ids = set(), set(), set()
    for entry in entries:
        if entry.assigned_to_id:
            user_ids.add(entry.assigned_to_id)
        if entry.category_id:
            category_ids.add(entry.category_id)
        if entry.department_id:
            department_ids.add(entry.department_id)

    user_names = {u.id: u.name or u.email or str(u.id) for u in User.objects.filter(id__in=user_ids)}
    category_names = {c.id: c.name for c in Category.objects.filter(id__in=category_ids)}
    department_names = {d.id: d.name for d in Department.objects.filter(id__in=department_ids)}

    fk_lookup = {
        "assigned_to_id": user_names,
        "category_id": category_names,
        "department_id": department_names,
    }

    def fmt(field, val):
        if val is None:
            return None
        if field in fk_lookup:
            return fk_lookup[field].get(val, str(val))
        return str(val)

    result = []
    for i, entry in enumerate(entries):
        prev = entries[i + 1] if i + 1 < len(entries) else None
        changes = []
        if prev:
            for field in _TRACKED_FIELDS:
                old_val = getattr(prev, field, None)
                new_val = getattr(entry, field, None)
                if old_val != new_val:
                    changes.append(
                        {
                            "field": field,
                            "old": fmt(field, old_val),
                            "new": fmt(field, new_val),
                        }
                    )
        result.append(
            {
                "history_id": entry.history_id,
                "date": entry.history_date,
                "user": (entry.history_user.name or entry.history_user.email) if entry.history_user else None,
                "type": entry.history_type,
                "changes": changes,
            }
        )
    return result
