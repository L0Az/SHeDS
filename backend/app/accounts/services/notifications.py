import logging

from django.conf import settings
from django.utils.html import escape

from app.accounts import choices

logger = logging.getLogger(__name__)


def _get_config():
    from app.settings.models import AppConfig

    return AppConfig.objects.first()


def _create_in_app(user, kind, content, ticket=None):
    from app.accounts.models import UserNotifications

    UserNotifications.objects.create(user=user, kind=kind, content=content, ticket=ticket)


def _ticket_url(ticket):
    base = getattr(settings, "FRONTEND_URL", "http://localhost:3000").rstrip("/")
    return f"{base}/tickets/{ticket.id}"


def _email_html(app_name, heading, body_html, ticket_url):
    safe_app = escape(app_name)
    safe_heading = escape(heading)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{safe_heading}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:24px 40px;">
              <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:-0.3px;">{safe_app}</span>
              <span style="color:#a5b4fc;font-size:14px;margin-left:8px;">Helpdesk</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <h1 style="margin:0 0 16px;color:#0f172a;font-size:20px;font-weight:600;line-height:1.3;">{safe_heading}</h1>
              <div style="color:#475569;font-size:15px;line-height:1.75;">{body_html}</div>
              <div style="margin-top:32px;">
                <a href="{ticket_url}"
                   style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
                  View Ticket &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                This notification was sent by <strong>{safe_app}</strong> because you are involved in this support ticket.
                If you did not expect this, you can safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _queue_email(user, subject, plain_text, html_body):
    from app.accounts.tasks import send_notification_email

    if not user.email:
        return
    from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@sheds.local")
    try:
        send_notification_email.delay(user.email, subject, plain_text, html_body, from_email)
    except Exception:
        logger.exception("Failed to enqueue notification email for user %s", user.pk)


def dispatch_status_changed(ticket, old_status, new_status):
    config = _get_config()
    if not config or not config.notify_on_status_change:
        return

    app_name = config.app_name or "SHeDS"
    url = _ticket_url(ticket)
    content = f'Ticket #{ticket.id} "{ticket.title}" status changed from {old_status} to {new_status}.'

    _create_in_app(ticket.customer, choices.NOTIFICATION_KIND_TICKET_STATUS_CHANGED, content, ticket)

    if config.email_notifications_enabled:
        plain = f"{content}\n\nView ticket: {url}"
        body_html = (
            f"The status of ticket <strong>#{ticket.id} &mdash; {escape(ticket.title)}</strong> "
            f"has been updated from <strong>{escape(old_status)}</strong> "
            f"to <strong>{escape(new_status)}</strong>."
        )
        html = _email_html(app_name, "Ticket status updated", body_html, url)
        _queue_email(ticket.customer, f"[{app_name}] Ticket #{ticket.id} status updated", plain, html)


def dispatch_assignment_changed(ticket, new_assignee):
    config = _get_config()
    if not config or not config.notify_on_assignment or new_assignee is None:
        return

    app_name = config.app_name or "SHeDS"
    url = _ticket_url(ticket)
    content = f'You have been assigned to ticket #{ticket.id} "{ticket.title}".'

    _create_in_app(new_assignee, choices.NOTIFICATION_KIND_TICKET_ASSIGNED, content, ticket)

    if config.email_notifications_enabled:
        plain = f"{content}\n\nView ticket: {url}"
        body_html = (
            f"You have been assigned to ticket <strong>#{ticket.id} &mdash; {escape(ticket.title)}</strong>. "
            f"Please review it and take the appropriate action."
        )
        html = _email_html(app_name, "You have been assigned to a ticket", body_html, url)
        _queue_email(new_assignee, f"[{app_name}] You have been assigned to ticket #{ticket.id}", plain, html)


def dispatch_comment_added(ticket, comment):
    config = _get_config()
    if not config or not config.notify_on_comment:
        return

    app_name = config.app_name or "SHeDS"
    url = _ticket_url(ticket)
    author_name = comment.author.name or comment.author.email
    content = f'New comment on ticket #{ticket.id} "{ticket.title}".'

    targets = set()
    if not comment.is_private:
        targets.add(ticket.customer)
    if ticket.assigned_to:
        targets.add(ticket.assigned_to)
    targets.discard(comment.author)

    for user in targets:
        _create_in_app(user, choices.NOTIFICATION_KIND_TICKET_COMMENTED, content, ticket)
        if config.email_notifications_enabled:
            plain = f"{content}\n\nView ticket: {url}"
            body_html = (
                f"A new comment has been posted on ticket <strong>#{ticket.id} &mdash; {escape(ticket.title)}</strong> "
                f"by <strong>{escape(author_name)}</strong>."
            )
            html = _email_html(app_name, "New comment on your ticket", body_html, url)
            _queue_email(user, f"[{app_name}] New comment on ticket #{ticket.id}", plain, html)
