from django.urls import re_path

from app.helpdesk.views import (
    AttachmentDetailView,
    AttachmentInTicketView,
    CategoryDetailView,
    CategoryView,
    CommentInTicketView,
    DepartmentDetailView,
    DepartmentView,
    PresignAttachmentView,
    TicketAssigneesView,
    TicketDetailView,
    TicketHistoryView,
    TicketView,
)

urlpatterns = [
    re_path(r"^(?P<version>(v1))/helpdesk/departments/$", DepartmentView.as_view(), name="department-list-create"),
    re_path(r"^(?P<version>(v1))/helpdesk/departments/(?P<pk>\d+)/$", DepartmentDetailView.as_view(), name="department-detail"),
    re_path(r"^(?P<version>(v1))/helpdesk/categories/$", CategoryView.as_view(), name="category-list-create"),
    re_path(r"^(?P<version>(v1))/helpdesk/categories/(?P<pk>\d+)/$", CategoryDetailView.as_view(), name="category-detail"),
    re_path(r"^(?P<version>(v1))/helpdesk/assignees/$", TicketAssigneesView.as_view(), name="ticket-assignees"),
    re_path(r"^(?P<version>(v1))/helpdesk/tickets/$", TicketView.as_view(), name="ticket-list-create"),
    re_path(r"^(?P<version>(v1))/helpdesk/tickets/(?P<pk>\d+)/$", TicketDetailView.as_view(), name="ticket-detail"),
    re_path(r"^(?P<version>(v1))/helpdesk/tickets/(?P<ticket_pk>\d+)/history/$", TicketHistoryView.as_view(), name="ticket-history"),
    re_path(r"^(?P<version>(v1))/helpdesk/tickets/(?P<ticket_pk>\d+)/comments/$", CommentInTicketView.as_view(), name="ticket-comment-create"),
    re_path(r"^(?P<version>(v1))/helpdesk/tickets/(?P<ticket_pk>\d+)/attachments/presign/$", PresignAttachmentView.as_view(), name="ticket-attachment-presign"),
    re_path(r"^(?P<version>(v1))/helpdesk/tickets/(?P<ticket_pk>\d+)/attachments/$", AttachmentInTicketView.as_view(), name="ticket-attachment-list-create"),
    re_path(
        r"^(?P<version>(v1))/helpdesk/tickets/(?P<ticket_pk>\d+)/attachments/(?P<pk>\d+)/$", AttachmentDetailView.as_view(), name="ticket-attachment-detail"
    ),
]
