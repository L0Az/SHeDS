FROM python:3.12-slim

# Copy uv from the official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
#ENV DJANGO_SETTINGS_MODULE config.settings.production

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    libc6-dev \
    python3-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY pyproject.toml uv.lock /app/

# Install dependencies
RUN uv sync --frozen --no-dev --no-install-project

# Place the virtual environment in the path
ENV PATH="/app/.venv/bin:$PATH"

COPY . /app/

ENV PYTHONPATH=/app:/app/vendor

EXPOSE 9000

#CMD ["gunicorn", "--bind", "0.0.0.0:9000", "--workers", "3", "config.wsgi:application"]

# Uncomment to run with Uvicorn instead
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "9000"]