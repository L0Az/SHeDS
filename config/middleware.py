import logging

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.shortcuts import redirect
from django.urls import reverse
from django.utils import timezone
from django.utils.deprecation import MiddlewareMixin


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)

class RequestLogMiddleware(MiddlewareMixin):
    def process_request(self, request):
        timestamp = timezone.now()
        logging.info(f"Request: {timestamp}")
        ip = request.META.get("REMOTE_ADDR")
        logging.info(f"IP: {ip}")
        uri = request.build_absolute_uri()
        logging.info(f"URI: {uri}")
        method = request.method
        logging.info(f"Method: {method}")
        content_type = request.content_type
        logging.info(f"Content Type: {content_type}")
    def process_response(self, request, response):
        timestamp = timezone.now()
        return response


class SwaggerAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/swagger"):
            if not request.user.is_authenticated:
                return redirect(f"{reverse('admin:login')}?next={request.path}")

            if not request.user.is_staff and not request.user.is_superuser:
                return self.unauthorized_response()

        return self.get_response(request)

    def unauthorized_response(self):
        response = HttpResponse("Unauthorized", status=403)
        return response
