#!/bin/bash
# Script to verify scraper functionality, particularly birth year extraction
echo "Timataka Scraper Verification Script"
echo "===================================="
echo "This script will test the scraper's ability to extract birth years"
echo

if [ -z "$(docker ps -q -f name=timataka_backend)" ]; then
  echo "Running test outside Docker container..."
  cd backend && NODE_ENV=development USE_MOCK_DATA=false node src/tests/verify-scraper.js
else
  echo "Running test using Docker container..."
  docker compose exec backend node src/tests/verify-scraper.js
fi
