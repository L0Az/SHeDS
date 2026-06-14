from django.db import models
from simple_history.models import HistoricalRecords

from app.common.models import DefaultModel
from app.helpdesk import choices as helpdesk_choices


class Department(DefaultModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Departamento"
        verbose_name_plural = "Departamentos"


class Category(DefaultModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="categories")

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"


class Ticket(DefaultModel):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="tickets")
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name="tickets")
    customer = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="tickets")
    assigned_to = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, related_name="assigned_tickets", blank=True, null=True)
    status = models.CharField(max_length=20, choices=helpdesk_choices.TICKET_STATUS_CHOICES, default=helpdesk_choices.OPEN_TICKET_STATUS)
    priority = models.CharField(max_length=20, choices=helpdesk_choices.PRIORITY_CHOICES, default=helpdesk_choices.MEDIUM_PRIORITY)
    closed_at = models.DateTimeField(blank=True, null=True)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Ticket"
        verbose_name_plural = "Tickets"


class TicketComment(DefaultModel):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="comments")
    body = models.TextField()
    is_private = models.BooleanField(default=False)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Comentário do Ticket"
        verbose_name_plural = "Comentários dos Tickets"


class TicketAttachment(DefaultModel):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="attachments")
    comment = models.ForeignKey(TicketComment, on_delete=models.CASCADE, related_name="attachments", blank=True, null=True)
    file = models.FileField(upload_to="ticket_attachments/")
    uploaded_by = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="attachments")
    original_filename = models.CharField(max_length=255)
    size_bytes = models.PositiveIntegerField()
    content_type = models.CharField(max_length=255)

    history = HistoricalRecords()

    class Meta:
        verbose_name = "Anexo do Ticket"
        verbose_name_plural = "Anexos dos Tickets"
