from decouple import config  # noqa

from .base import *  # noqa

DEBUG = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/3.0/howto/static-files/
DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"
STATICFILES_STORAGE = "django.contrib.staticfiles.storage.StaticFilesStorage"
STATICFILES_DIRS = []
MEDIA_ROOT = config("MEDIA_ROOT", default="media")
STATIC_ROOT = config("STATIC_ROOT", default="static")
STATIC_URL = "/static/"
MEDIA_URL = "/media/"


CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://localhost:3000",
    "http://127.0.0.1:3000",
    "https://127.0.0.1:3000",
]

ALLOWED_HOSTS = ["127.0.0.1", "localhost", "172.24.239.167", "172.24.155.86"]

INTERNAL_IPS = [
    "127.0.0.1",
]

# Database
# https://docs.djangoproject.com/en/3.0/ref/settings/#databases
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": config("DB_HOST", default="localhost"),
        "PORT": config("DB_PORT", default="55999"),
        "USER": config("DB_USER", default="sheds_user"),
        "PASSWORD": config("DB_PASSWORD", default="sheds_password"),
        "NAME": config("DB_NAME", default="sheds_db"),
    }
}

SECURE_SSL_REDIRECT = False
