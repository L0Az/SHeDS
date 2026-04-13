from django.conf import settings


def is_local():
    return settings.STAGE == "local"


def is_test():
    return settings.TEST


def is_prod():
    return settings.STAGE == "prod"


def is_homolog():
    return settings.STAGE == "homolog"
