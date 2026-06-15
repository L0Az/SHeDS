import logging
from datetime import timedelta

from celery import shared_task
from django.db import models
from django.db.models import OuterRef, Subquery
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task
def close_inactive_tickets():
    from app.helpdesk import choices as helpdesk_choices
    from app.helpdesk.models import Ticket, TicketComment
    from app.settings.models import AppConfig

    config = AppConfig.objects.first()
    if not config or not config.auto_close_inactive_tickets:
        return 0

    cutoff = timezone.now() - timedelta(days=config.auto_close_after_days)

    latest_comment_date = TicketComment.objects.filter(ticket=OuterRef("pk")).order_by("-created_at").values("created_at")[:1]

    stale = (
        Ticket.objects.exclude(status=helpdesk_choices.CLOSED_TICKET_STATUS)
        .annotate(last_comment_at=Subquery(latest_comment_date))
        .filter(
            updated_at__lt=cutoff,
        )
        .filter(models.Q(last_comment_at__isnull=True) | models.Q(last_comment_at__lt=cutoff))
    )

    now = timezone.now()
    count = stale.update(status=helpdesk_choices.CLOSED_TICKET_STATUS, closed_at=now)
    logger.info("Auto-closed %d inactive tickets (cutoff: %s)", count, cutoff.date())
    return count


@shared_task
def purge_old_history():
    from app.helpdesk.models import Category, Department, Ticket, TicketAttachment, TicketComment
    from app.settings.models import AppConfig

    config = AppConfig.objects.first()
    if not config:
        return 0

    cutoff = timezone.now() - timedelta(days=config.log_retention_days)

    historical_models = [Department, Category, Ticket, TicketComment, TicketAttachment]
    total = 0
    for model in historical_models:
        deleted, _ = model.history.filter(history_date__lt=cutoff).delete()
        total += deleted

    logger.info(
        "Purged %d historical records older than %d days (cutoff: %s)",
        total,
        config.log_retention_days,
        cutoff.date(),
    )
    return total
