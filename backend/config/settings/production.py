from decouple import config  # noqa

from .base import *  # noqa

STORAGES = {
    "default": {
        "BACKEND": "config.storage.MediaOCIStorage",
    },
    "staticfiles": {
        "BACKEND": "config.storage.StaticOCIStorage",
    },
}

OCI_USER_OCID = config("OCI_USER_OCID", default="", cast=str)
OCI_FINGERPRINT = config("OCI_FINGERPRINT", default="", cast=str)
OCI_TENANCY_OCID = config("OCI_TENANCY_OCID", default="", cast=str)
OCI_KEY_FILE = config("OCI_KEY_FILE", default="", cast=str)
OCI_KEY_CONTENT = config("OCI_KEY_CONTENT", default="", cast=str)
OCI_KEY_PASSPHRASE = config("OCI_KEY_PASSPHRASE", default="", cast=str)

OCI_USE_INSTANCE_PRINCIPAL = config("OCI_USE_INSTANCE_PRINCIPAL", default=False, cast=bool)

OCI_REGION = config("OCI_REGION", default="sa-vinhedo-1", cast=str)
OCI_NAMESPACE = config("OCI_NAMESPACE", default="", cast=str)
OCI_BUCKET_NAME = config("OCI_BUCKET_NAME", default="django-bucket", cast=str)
OCI_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}

OCI_CUSTOM_DOMAIN = config("OCI_CUSTOM_DOMAIN", default="", cast=str)

STATIC_URL = f"https://objectstorage.{OCI_REGION}.oraclecloud.com/n/{OCI_NAMESPACE}/b/{OCI_BUCKET_NAME}/o/static/"
MEDIA_URL = f"https://objectstorage.{OCI_REGION}.oraclecloud.com/n/{OCI_NAMESPACE}/b/{OCI_BUCKET_NAME}/o/media/"

STATICFILES_DIRS = []
INTERNAL_IPS = ["*"]

# DATABASE_ROUTERS = ["config.db_route.DbRouter"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "HOST": config("DB_HOST"),
        "PORT": config("DB_PORT", default="5432"),
        "USER": config("DB_USER"),
        "PASSWORD": config("DB_PASSWORD"),
        "NAME": config("DB_NAME"),
        "OPTIONS": {"connect_timeout": config("DB_TIMEOUT", default="30")},
    }
}

STATIC_ROOT = "/static/"

_DOMAIN = config("DOMAIN", default="")
CORS_ALLOWED_ORIGINS = [f"https://{_DOMAIN}"] if _DOMAIN else []
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = [f"https://{_DOMAIN}"] if _DOMAIN else []

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": "redis://{}".format(config("CACHE_LOCATION")),
        "TIMEOUT": 86400,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            "IGNORE_EXCEPTIONS": True,
            "CONNECTION_POOL_KWARGS": {"max_connections": 4},
        },
    }
}
