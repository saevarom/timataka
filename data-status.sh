#!/bin/bash
# Script to show current data source status

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}Timataka Data Source Status${NC}"
echo "=============================="

# Check current setting in docker-compose.yml
if [ -f docker-compose.yml ]; then
  CURRENT_SETTING=$(grep "USE_MOCK_DATA=" docker-compose.yml | cut -d= -f2)
  
  if [ "$CURRENT_SETTING" == "true" ]; then
    echo -e "${YELLOW}Currently using: ${BOLD}MOCK DATA${NC}"
    echo -e "All data is sourced from local mock files."
    echo -e "\nTo switch to real data, run: ${BLUE}./toggle-data-source.sh real${NC}"
  elif [ "$CURRENT_SETTING" == "false" ]; then
    echo -e "${GREEN}Currently using: ${BOLD}REAL DATA${NC}"
    echo -e "Data is being scraped directly from timataka.net"
    echo -e "\nTo switch to mock data, run: ${BLUE}./toggle-data-source.sh mock${NC}"
  else
    echo -e "${RED}Could not determine current data source.${NC}"
  fi
else
  echo -e "${RED}Could not find docker-compose.yml file.${NC}"
fi

# Check if containers are running
echo -e "\n${BOLD}Container Status${NC}"
echo "================"

if command -v docker &> /dev/null; then
  if docker ps | grep -q "timataka_backend"; then
    echo -e "${GREEN}Backend container is running.${NC}"
    
    # Check if backend needs restart after config change
    CONTAINER_ENV=$(docker exec timataka_backend printenv USE_MOCK_DATA 2>/dev/null || echo "unknown")
    
    if [ "$CONTAINER_ENV" != "$CURRENT_SETTING" ] && [ "$CONTAINER_ENV" != "unknown" ]; then
      echo -e "${RED}Warning: Container configuration differs from docker-compose.yml${NC}"
      echo -e "You need to restart the backend: ${BLUE}docker compose restart backend${NC}"
    fi
  else
    echo -e "${RED}Backend container is not running.${NC}"
    echo -e "Start containers with: ${BLUE}docker compose up -d${NC}"
  fi
else
  echo -e "${RED}Docker command not found.${NC}"
fi

echo -e "\n${BOLD}Available Commands${NC}"
echo "================="
echo -e "${BLUE}./toggle-data-source.sh real${NC}  - Switch to real data"
echo -e "${BLUE}./toggle-data-source.sh mock${NC}  - Switch to mock data"
echo -e "${BLUE}./monitor-scraper.sh${NC}         - Test real data scraping"
echo -e "${BLUE}./test-scraper.sh${NC}            - Test birth year extraction"
echo -e "${BLUE}docker compose restart backend${NC} - Restart backend after toggling data source"
