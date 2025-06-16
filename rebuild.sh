#!/bin/bash
# Script to rebuild and restart the application

echo "Rebuilding and restarting Timataka application..."
echo "================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker and try again."
  exit 1
fi

# Get the current directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Build and restart the containers
docker compose down
docker compose build
docker compose up -d

echo "================================================="
echo "Application rebuilt and restarted."
echo "You can access it at: http://localhost"
echo "To view logs: docker compose logs -f"
