import logging

from celery import shared_task
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_notification_email(self, user_email: str, subject: str, body: str, from_email: str):
    try:
        send_mail(subject, body, from_email, [user_email], fail_silently=False)
    except Exception as exc:
        logger.error("Failed to send notification email to %s: %s", user_email, exc)
        raise self.retry(exc=exc)
