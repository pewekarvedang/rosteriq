# ==============================================================================
# RosterIQ Backend Production Dockerfile
# Optimized for Render, Fly.io, Railway, AWS ECS or GCP Cloud Run
# ==============================================================================

FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install system dependencies needed for compiling psycopg2 and C++ OR-Tools dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend application source
COPY . /app

# Create a non-privileged user for security
RUN useradd -m -u 1000 rosteruser && \
    chown -R rosteruser:rosteruser /app

USER rosteruser

EXPOSE 8000

# Health check probing the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Production entrypoint running Uvicorn using dynamic PORT provided by host (e.g. Render sets PORT=10000)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
