#!/bin/bash
set -e

echo "=== Render Startup Script ==="

# Check if data directory is empty (first run with fresh disk)
if [ ! -d "/app/data/qdrant" ] || [ ! -d "/app/data/bm25_index" ]; then
    echo "Data directory empty, copying from staging..."

    # Copy all data from staging to persistent disk
    cp -rv /app/data_staging/* /app/data/

    echo "Data copy complete!"
else
    echo "Data already exists on persistent disk, skipping copy."
fi

# List data directory contents for debugging
echo "=== Data directory contents ==="
ls -la /app/data/

# Start the application
echo "=== Starting API server ==="
exec python -m uvicorn src.api.main:app --host 0.0.0.0 --port ${PORT:-8000}
