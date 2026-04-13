from django.conf import settings
from django_hosts import host, patterns

host_patterns = patterns(
    "",
    host(r"(api|api\-staging)", settings.ROOT_URLCONF, name="api"),
    host(r"(dash|dash\-staging)", settings.ROOT_URLADMIN, name="dash"),
)
