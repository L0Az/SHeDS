from backend.config.settings.base import *  # noqa

SECRET_KEY = 'yymxp*lpy_wuxbcc8zxduz9p(thzliu67zzwbe$o'

ALLOWED_HOSTS = ['*']
CORS_ALLOW_ALL_ORIGINS = True

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

SECURE_SSL_REDIRECT = False

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')  # noqa
STATIC_ROOT = os.path.join(BASE_DIR, 'static')  # noqa

STATIC_URL = '/static/'
MEDIA_URL = '/media/'
