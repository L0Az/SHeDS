import logging

from django.conf import settings

from app.accounts import choices

logger = logging.getLogger(__name__)


def _get_config():
    from app.settings.models import AppConfig

    return AppConfig.objects.first()


def _create_in_app(user, kind, content, ticket=None):
    from app.accounts.models import UserNotifications

    UserNotifications.objects.create(user=user, kind=kind, content=content, ticket=ticket)


def _queue_email(user, subject, body):
    from app.accounts.tasks import send_notification_email

    if not user.email:
        return
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@sheds.local")
    try:
        send_notification_email.delay(user.email, subject, body, from_email)
    except Exception:
        logger.exception("Failed to enqueue notification email for user %s", user.pk)


def dispatch_status_changed(ticket, old_status, new_status):
    config = _get_config()
    if not config or not config.notify_on_status_change:
        return
    content = f"Ticket #{ticket.id} \"{ticket.title}\" status changed from {old_status} to {new_status}."
    _create_in_app(ticket.customer, choices.NOTIFICATION_KIND_TICKET_STATUS_CHANGED, content, ticket)
    if config.email_notifications_enabled:
        _queue_email(ticket.customer, f"[SHeDS] Ticket #{ticket.id} status updated", content)


def dispatch_assignment_changed(ticket, new_assignee):
    config = _get_config()
    if not config or not config.notify_on_assignment or new_assignee is None:
        return
    content = f"You have been assigned to ticket #{ticket.id} \"{ticket.title}\"."
    _create_in_app(new_assignee, choices.NOTIFICATION_KIND_TICKET_ASSIGNED, content, ticket)
    if config.email_notifications_enabled:
        _queue_email(new_assignee, f"[SHeDS] You have been assigned to ticket #{ticket.id}", content)


def dispatch_comment_added(ticket, comment):
    config = _get_config()
    if not config or not config.notify_on_comment:
        return
    content = f"New comment on ticket #{ticket.id} \"{ticket.title}\"."
    targets = {ticket.customer}
    if ticket.assigned_to:
        targets.add(ticket.assigned_to)
    targets.discard(comment.author)
    for user in targets:
        _create_in_app(user, choices.NOTIFICATION_KIND_TICKET_COMMENTED, content, ticket)
        if config.email_notifications_enabled:
            _queue_email(user, f"[SHeDS] New comment on ticket #{ticket.id}", content)
