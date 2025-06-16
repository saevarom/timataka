#!/bin/bash
# Timataka Real Data Diagnostics Tool
# This script helps diagnose and fix issues with real data from timataka.net

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}Timataka Real Data Diagnostics Tool${NC}"
echo "====================================="
echo "This tool will help diagnose and fix issues with real data from timataka.net"
echo

# Check if docker is running
if ! docker info &>/dev/null; then
  echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
  exit 1
fi

# Check if backend container is running
if ! docker ps | grep -q "timataka-backend"; then
  echo -e "${RED}Backend container is not running. Please start it with 'docker compose up -d'.${NC}"
  exit 1
fi

# Check current data source setting
CURRENT_SETTING=$(grep "USE_MOCK_DATA=" docker-compose.yml | cut -d= -f2)
CACHE_SETTING=$(grep "CACHE_ENABLED=" docker-compose.yml | cut -d= -f2 || echo "true")
DOCKER_SETTING=$(docker exec timataka-backend-1 printenv USE_MOCK_DATA 2>/dev/null || echo "unknown")
DOCKER_CACHE_SETTING=$(docker exec timataka-backend-1 printenv CACHE_ENABLED 2>/dev/null || echo "true")
NODE_ENV=$(docker exec timataka-backend-1 printenv NODE_ENV 2>/dev/null || echo "unknown")

echo -e "${BOLD}Current Configuration${NC}"
echo "====================="
echo -e "docker-compose.yml setting: USE_MOCK_DATA=${BLUE}${CURRENT_SETTING}${NC}"
echo -e "docker-compose.yml setting: CACHE_ENABLED=${BLUE}${CACHE_SETTING}${NC}"
echo -e "Container environment: USE_MOCK_DATA=${BLUE}${DOCKER_SETTING}${NC}"
echo -e "Container environment: CACHE_ENABLED=${BLUE}${DOCKER_CACHE_SETTING}${NC}"
echo -e "Container NODE_ENV: ${BLUE}${NODE_ENV}${NC}"

# Determine actual data source based on code logic
echo
echo -e "${BOLD}Actual Data Source${NC}"
echo "=================="
if [ "$DOCKER_SETTING" = "false" ]; then
  echo -e "${GREEN}Using REAL data from timataka.net${NC}"
else
  if [ "$DOCKER_SETTING" = "true" ] || [ "$NODE_ENV" = "development" ]; then
    echo -e "${YELLOW}Using MOCK data${NC}"
    echo -e "To use real data, set USE_MOCK_DATA=false and restart the backend"
  else
    echo -e "${RED}Cannot determine data source${NC}"
  fi
fi

# Test basic endpoints
echo
echo -e "${BOLD}API Endpoint Tests${NC}"
echo "==================="

function test_endpoint() {
  local endpoint=$1
  local description=$2
  
  echo -e "${YELLOW}Testing: ${description} (${endpoint})${NC}"
  
  result=$(curl -s "http://localhost:4000${endpoint}")
  
  if [[ $result == *"error"* ]]; then
    echo -e "${RED}Failed: Error detected in response${NC}"
    echo "$result" | grep -o '"message":"[^"]*"' || echo "$result" | grep -o '"error":"[^"]*"'
    return 1
  elif [[ -z "$result" || "$result" == "[]" ]]; then
    echo -e "${RED}Warning: Empty response${NC}"
    return 1
  else
    echo -e "${GREEN}Success: Data received${NC}"
    if [[ $result == "["* ]]; then
      echo "$result" | grep -o '"id":"[^"]*"' | head -n 2
    else
      echo "$result" | grep -o '"status":"[^"]*"'
    fi
    return 0
  fi
}

test_endpoint "/health" "Health Check"
test_endpoint "/data-source" "Data Source Info"
test_endpoint "/events" "Events List"

# Run specific diagnostic for real data
if [ "$DOCKER_SETTING" = "false" ]; then
  echo
  echo -e "${BOLD}Real Data Specific Diagnostics${NC}"
  echo "============================"
  
  echo -e "${YELLOW}Checking backend logs for scraping errors...${NC}"
  scraping_errors=$(docker logs timataka-backend-1 --since=1h | grep -i "error" | grep -i "scrap\|timataka\|fetch")
  
  if [[ -n "$scraping_errors" ]]; then
    echo -e "${RED}Found potential scraping errors:${NC}"
    echo "$scraping_errors" | tail -n 5
    echo "..."
    
    echo
    echo -e "${YELLOW}Recommendation:${NC}"
    echo "1. Check if timataka.net website structure has changed."
    echo "2. Try temporarily switching back to mock data:"
    echo "   ./toggle-data-source.sh mock"
    echo "   docker compose restart backend"
  else
    echo -e "${GREEN}No major scraping errors detected in recent logs.${NC}"
  fi
  
  # Check if we're getting empty results
  echo
  echo -e "${YELLOW}Checking for empty results...${NC}"
  empty_results=$(docker logs timataka-backend-1 --since=1h | grep -i "no \|empty \|not found")
  
  if [[ -n "$empty_results" ]]; then
    echo -e "${RED}Found messages about empty results:${NC}"
    echo "$empty_results" | tail -n 5
    echo "..."
    
    echo
    echo -e "${YELLOW}Recommendation:${NC}"
    echo "This might indicate that real data for some features is not available."
    echo "Consider trying mock data to see how those features should work:"
    echo "   ./toggle-data-source.sh mock"
    echo "   docker compose restart backend"
  else
    echo -e "${GREEN}No messages about empty results detected in recent logs.${NC}"
  fi
fi

echo
echo -e "${BOLD}Cache Status${NC}"
echo "=============="
CACHE_HITS=$(docker logs timataka-backend-1 2>&1 | grep -i "Cache hit for" | wc -l)
CACHE_MISSES=$(docker logs timataka-backend-1 2>&1 | grep -i "Cache expired for" | wc -l)
CACHE_SAVES=$(docker logs timataka-backend-1 2>&1 | grep -i "Cached data for" | wc -l)

if [ "$DOCKER_CACHE_SETTING" = "false" ]; then
  echo -e "${YELLOW}Cache is disabled in the container.${NC}"
else
  echo -e "Cache statistics from logs:"
  echo -e "  - ${GREEN}$CACHE_HITS cache hits${NC}"
  echo -e "  - ${YELLOW}$CACHE_MISSES cache misses${NC}"
  echo -e "  - ${BLUE}$CACHE_SAVES cache saves${NC}"
  
  # Check if cache directory exists and has files
  CACHE_DIR_EXISTS=$(docker exec timataka-backend-1 test -d /app/data/cache && echo "yes" || echo "no")
  
  if [ "$CACHE_DIR_EXISTS" = "yes" ]; then
    CACHE_FILES=$(docker exec timataka-backend-1 find /app/data/cache -type f | wc -l)
    echo -e "  - Cache directory contains ${BLUE}$CACHE_FILES files${NC}"
  else
    echo -e "  - ${YELLOW}Cache directory does not exist yet${NC}"
  fi
fi

echo
echo -e "${BOLD}Recommendations${NC}"
echo "================"

if [ "$DOCKER_SETTING" != "$CURRENT_SETTING" ]; then
  echo -e "${RED}Warning: Container environment doesn't match docker-compose.yml${NC}"
  echo "You need to restart the backend container to apply the current config:"
  echo "   docker compose restart backend"
fi

echo -e "${BLUE}For more information on using real data, see the documentation:${NC}"
echo "cat ./REAL-DATA.md"

echo
echo -e "${GREEN}Diagnostics complete!${NC}"
