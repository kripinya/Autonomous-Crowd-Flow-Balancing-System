# Build Stage
FROM python:3.11-slim as builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Final Stage
FROM python:3.11-slim

WORKDIR /app

# Non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser

COPY --from=builder /install /usr/local
COPY . .

# Set permissions
RUN chown -R appuser:appuser /app

USER appuser

# Allow statements and log messages to immediately appear in the Knative logs
ENV PYTHONUNBUFFERED True

# Run the web service on container startup using gunicorn
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
