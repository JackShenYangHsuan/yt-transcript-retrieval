#!/bin/bash
set -e

echo "=== Render Startup Script ==="
echo "Current directory: $(pwd)"
echo "PORT: ${PORT:-8000}"

# Debug: Check what's in the image
echo "=== Checking data_staging directory ==="
ls -la /app/data_staging/ 2>/dev/null || echo "data_staging directory NOT FOUND!"
ls -la /app/data_staging/ideas/ 2>/dev/null || echo "data_staging/ideas directory NOT FOUND!"
ls -la /app/data_staging/qdrant/ 2>/dev/null || echo "data_staging/qdrant directory NOT FOUND!"

# Debug: Check persistent disk mount
echo "=== Checking /app/data mount ==="
ls -la /app/data/ 2>/dev/null || echo "/app/data directory NOT FOUND!"
df -h /app/data/ 2>/dev/null || echo "Cannot check disk space"

# Check if data directory is empty (first run with fresh disk)
if [ ! -d "/app/data/qdrant" ] || [ ! -d "/app/data/bm25_index" ]; then
    echo "=== Data directory empty, copying from staging... ==="

    # Ensure target directory exists
    mkdir -p /app/data

    # Copy all data from staging to persistent disk
    if [ -d "/app/data_staging" ]; then
        cp -rv /app/data_staging/* /app/data/
        echo "=== Data copy complete! ==="
    else
        echo "ERROR: /app/data_staging does not exist! Data was not included in Docker image."
        echo "Listing /app contents:"
        ls -la /app/
    fi
else
    echo "Data already exists on persistent disk, skipping copy."
fi

# List data directory contents for debugging
echo "=== Final /app/data directory contents ==="
ls -la /app/data/
ls -la /app/data/ideas/ 2>/dev/null || echo "No ideas directory"
ls -la /app/data/qdrant/ 2>/dev/null || echo "No qdrant directory"

# Start the application
echo "=== Starting API server on port ${PORT:-8000} ==="
exec python -m uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}
