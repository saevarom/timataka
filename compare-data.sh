#!/bin/bash
# Script to compare mock data with real data

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}Timataka Mock vs Real Data Comparison${NC}"
echo "====================================="
echo "This tool compares mock data with real data from timataka.net"
echo

# Check if docker is running
if ! docker info &>/dev/null; then
  echo -e "${RED}Docker is not running. Please start Docker first.${NC}"
  exit 1
fi

# Check if backend container is running
if ! docker ps | grep -q "timataka_backend"; then
  echo -e "${RED}Backend container is not running. Please start it with 'docker compose up -d'.${NC}"
  exit 1
fi

# Function to get data and extract fields
get_data() {
  local endpoint=$1
  local source=$2  # "mock" or "real"
  local fields=$3
  
  # Set the appropriate environment variable
  local env=""
  if [ "$source" = "mock" ]; then
    env="USE_MOCK_DATA=true"
  else
    env="USE_MOCK_DATA=false"
  fi
  
  # Run the command and capture output
  local result=$(docker exec -e $env timataka_backend node -e "
    const axios = require('axios');
    axios.get('http://localhost:4000${endpoint}').then(response => {
      if (Array.isArray(response.data)) {
        if (response.data.length > 0) {
          console.log(JSON.stringify(response.data.slice(0, 5).map(item => {
            const result = {};
            ${fields}.forEach(field => {
              result[field] = item[field];
            });
            return result;
          })));
        } else {
          console.log('[]');
        }
      } else {
        console.log(JSON.stringify(response.data));
      }
    }).catch(err => console.error('Error:', err.message));
  ")
  
  echo "$result"
}

# Compare data from both sources
compare_endpoint() {
  local name=$1
  local endpoint=$2
  local fields=$3
  
  echo -e "${BLUE}Comparing ${BOLD}${name}${NC}"
  echo -e "${BLUE}Endpoint: ${endpoint}${NC}"
  
  echo -e "${YELLOW}Fetching mock data...${NC}"
  mock_data=$(get_data "$endpoint" "mock" "$fields")
  
  echo -e "${YELLOW}Fetching real data...${NC}"
  real_data=$(get_data "$endpoint" "real" "$fields")
  
  if [ "$mock_data" = "$real_data" ]; then
    echo -e "${GREEN}✓ Data matches!${NC}"
  else
    echo -e "${RED}✗ Data differs${NC}"
    
    # Show differences in data structure
    mock_structure=$(echo "$mock_data" | jq -c 'if type == "array" then map(keys) | flatten | unique else keys end' 2>/dev/null)
    real_structure=$(echo "$real_data" | jq -c 'if type == "array" then map(keys) | flatten | unique else keys end' 2>/dev/null)
    
    if [ "$mock_structure" != "$real_structure" ]; then
      echo -e "${RED}Structure difference:${NC}"
      echo -e "Mock: $mock_structure"
      echo -e "Real: $real_structure"
    fi
    
    echo -e "${YELLOW}Sample mock data:${NC}"
    echo "$mock_data" | jq -C '.' 2>/dev/null || echo "$mock_data"
    
    echo -e "${YELLOW}Sample real data:${NC}"
    echo "$real_data" | jq -C '.' 2>/dev/null || echo "$real_data"
  fi
  echo "--------------------------------------------"
}

# Run comparisons for different endpoints
compare_endpoint "Events" "/events" "['id', 'name', 'date']"
compare_endpoint "Races" "/races" "['id', 'name', 'eventId']"
compare_endpoint "Race Results" "/races?raceId=reykjavik-marathon-2025-full" "['position', 'name', 'club', 'birthYear']"
compare_endpoint "Search" "/search?name=john" "['name', 'birthYear', 'club']"

echo -e "${BLUE}Comparison complete!${NC}"
echo -e "If you see significant differences, you may need to update your mock data"
echo -e "to better reflect the real data structure from timataka.net."
