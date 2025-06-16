#!/bin/bash
# Script to toggle between mock data and real data from timataka.net

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check current setting in docker-compose.yml
CURRENT_SETTING=$(grep "USE_MOCK_DATA=" docker-compose.yml | cut -d= -f2)

if [ "$1" == "mock" ] || ([ -z "$1" ] && [ "$CURRENT_SETTING" == "false" ]); then
    echo -e "${BLUE}Switching to mock data...${NC}"
    sed -i '' 's/USE_MOCK_DATA=false/USE_MOCK_DATA=true/g' docker-compose.yml
    echo -e "${GREEN}Now using mock data. Restart the containers for changes to take effect:${NC}"
    echo "  docker compose restart backend"
    
elif [ "$1" == "real" ] || ([ -z "$1" ] && [ "$CURRENT_SETTING" == "true" ]); then
    echo -e "${BLUE}Switching to real data from timataka.net...${NC}"
    sed -i '' 's/USE_MOCK_DATA=true/USE_MOCK_DATA=false/g' docker-compose.yml
    echo -e "${GREEN}Now using real data. Restart the containers for changes to take effect:${NC}"
    echo "  docker compose restart backend"
    echo -e "${RED}Note: If timataka.net changes their website structure, the scraping might fail.${NC}"
    echo -e "If you encounter errors, you can switch back to mock data with:"
    echo "  ./toggle-data-source.sh mock"
    
else
    echo -e "${RED}Invalid parameter. Use 'mock' or 'real' or leave blank to toggle.${NC}"
    exit 1
fi
