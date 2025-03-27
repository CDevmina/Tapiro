FROM python:3.11-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Copy requirements first for better caching
COPY ./requirements.txt /app/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r /app/requirements.txt

# Create non-root user
RUN addgroup --system app && adduser --system --ingroup app app

# Set appropriate permissions
RUN mkdir -p /app/app && chown -R app:app /app

# Copy application code
COPY ./app /app/app

# Switch to non-root user
USER app

# Expose the port
EXPOSE 8000

# Use --reload flag for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "app"]