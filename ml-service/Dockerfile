FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better caching
COPY ./requirements.txt /app/requirements.txt

# Install the CPU-only torch build first. The default PyPI wheel pulls in
# CUDA libraries (about 8 GB) that this service never uses.
RUN --mount=type=cache,target=/root/.cache/pip pip install --no-cache-dir torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu

# Install the rest. torch==2.6.0 in requirements.txt is already satisfied.
RUN --mount=type=cache,target=/root/.cache/pip pip install --no-cache-dir --upgrade -r /app/requirements.txt

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
