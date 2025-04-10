FROM python:3.11-slim

WORKDIR /app

# Install build dependencies first
RUN apt-get update --fix-missing && \
    apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY ./requirements.txt /app/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

# Create non-root user
RUN addgroup --system app && adduser --system --ingroup app app

# Create directories for model cache and set permissions
RUN mkdir -p /app/model_cache && chmod 777 /app/model_cache

# Copy application code
COPY ./app /app/app

# Switch to non-root user
USER app

# Expose the port
EXPOSE 8000

# Use --reload flag for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "app"]