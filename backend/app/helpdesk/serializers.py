from rest_framework import serializers

from app.helpdesk.models import Department, Category, Ticket, TicketAttachment, TicketComment

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
        fields = ["id", "ticket", "file", "filename"]
        
    
class TicketCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketComment
        fields = ["id", "ticket", "author", "body", "is_private"]
        
    
class TicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ticket
        fields = ["id", "title", "description", "category", "department", "customer", "assigned_to", "status", "priority", "closed_at"]