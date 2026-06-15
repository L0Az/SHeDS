from rest_framework.exceptions import NotFound

from app.helpdesk.models import Ticket


def get_ticket(ticket_id: int) -> Ticket:
    if ticket := Ticket.objects.filter(id=ticket_id).select_related('department', 'category', 'customer').first():
        return ticket

    raise NotFound("Ticket not found.")
