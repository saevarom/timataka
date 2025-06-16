#!/bin/bash
# Script to monitor real data scraping from timataka.net

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Timestamp function
timestamp() {
  date +"%Y-%m-%d %H:%M:%S"
}

echo -e "${YELLOW}$(timestamp) Starting timataka.net scraper monitoring...${NC}"
echo -e "${YELLOW}This will test if the scraper can successfully fetch data from timataka.net${NC}"
echo

# Check if we're using real data
CURRENT_SETTING=$(grep "USE_MOCK_DATA=" docker-compose.yml | cut -d= -f2)
if [ "$CURRENT_SETTING" == "true" ]; then
  echo -e "${RED}Currently using mock data. Switch to real data first:${NC}"
  echo "./toggle-data-source.sh real"
  exit 1
fi

echo -e "${YELLOW}Testing API endpoints with real data...${NC}"

# Function to test an endpoint
test_endpoint() {
  local endpoint=$1
  local description=$2
  
  echo -e "${YELLOW}$(timestamp) Testing: ${description} (${endpoint})${NC}"
  
  result=$(curl -s "http://localhost:4000${endpoint}")
  
  if [[ $result == *"error"* ]]; then
    echo -e "${RED}Failed: Error detected in response${NC}"
    echo "$result" | grep -o '"error":"[^"]*"' || echo "$result" | grep -o '"message":"[^"]*"'
    return 1
  elif [[ -z "$result" || "$result" == "[]" ]]; then
    echo -e "${RED}Failed: Empty response${NC}"
    return 1
  else
    echo -e "${GREEN}Success: Data received${NC}"
    echo "$result" | grep -o '"id":"[^"]*"' | head -n 2
    return 0
  fi
}

# Test endpoints
test_endpoint "/health" "Health Check"
test_endpoint "/events" "Events List"

# Get a sample event ID if available
event_id=$(curl -s "http://localhost:4000/events" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)
if [ -n "$event_id" ]; then
  test_endpoint "/races?eventId=$event_id" "Races for Event $event_id"
  
  # Get a sample race ID if available
  race_id=$(curl -s "http://localhost:4000/races?eventId=$event_id" | grep -o '"id":"[^"]*"' | head -n 1 | cut -d'"' -f4)
  if [ -n "$race_id" ]; then
    test_endpoint "/races?raceId=$race_id" "Results for Race $race_id"
  fi
fi

# Test search
test_endpoint "/search?name=john" "Search for contestants"

echo
echo -e "${YELLOW}$(timestamp) Testing completed.${NC}"
echo
echo -e "${GREEN}If all tests passed, the scraper is successfully fetching real data from timataka.net.${NC}"
echo -e "${YELLOW}If any tests failed, the website structure might have changed, or the site might be down.${NC}"
echo -e "${YELLOW}You can switch back to mock data if needed:${NC}"
echo "./toggle-data-source.sh mock"
