#!/bin/bash
# Script to test the real data connection to timataka.net
echo "Timataka Real Data Connection Test"
echo "================================="
echo "This script will test the connection to timataka.net and parse the HTML"
echo

if [ -z "$(docker ps -q -f name=timataka-backend)" ]; then
  echo "Running test outside Docker container..."
  cd backend && node src/tests/test-real-data.js
else
  echo "Running test using Docker container..."
  docker compose exec backend node src/tests/test-real-data.js
fi
