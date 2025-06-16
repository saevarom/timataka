#!/bin/bash
# Test script for timataka application

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Testing Timataka Application =====\n${NC}"

# Check if Docker containers are running
echo -e "${YELLOW}1. Checking Docker container status${NC}"
CONTAINERS=$(docker compose ps --format json)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker compose is available${NC}"
    RUNNING_COUNT=$(docker compose ps --format json | grep -c "running")
    echo -e "Found $RUNNING_COUNT running containers"
    if [ "$RUNNING_COUNT" -ge 3 ]; then
        echo -e "${GREEN}✓ All required containers are running${NC}"
    else
        echo -e "${RED}✗ Not all required containers are running${NC}"
        docker compose ps
    fi
else
    echo -e "${RED}✗ Docker compose command failed${NC}"
fi
echo ""

# Test Backend API endpoints
echo -e "${YELLOW}2. Testing Backend API Endpoints${NC}"

echo -e "\n${YELLOW}2.1 Testing health endpoint${NC}"
HEALTH_RESPONSE=$(curl -s http://localhost:4000/health)
if [[ $HEALTH_RESPONSE == *"OK"* ]]; then
    echo -e "${GREEN}✓ Health endpoint working${NC}"
    echo "$HEALTH_RESPONSE"
else
    echo -e "${RED}✗ Health endpoint not working${NC}"
    echo "$HEALTH_RESPONSE"
fi

echo -e "\n${YELLOW}2.2 Testing races endpoint${NC}"
RACES_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/races)
if [ "$RACES_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Races endpoint returned HTTP 200${NC}"
    echo "Sample data:"
    curl -s http://localhost:4000/races | head -n 1
    echo "..."
else
    echo -e "${RED}✗ Races endpoint failed with HTTP $RACES_RESPONSE${NC}"
fi

echo -e "\n${YELLOW}2.3 Testing search endpoint${NC}"
SEARCH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/search?name=jon")
if [ "$SEARCH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Search endpoint returned HTTP 200${NC}"
    echo "Search results for 'jon':"
    curl -s "http://localhost:4000/search?name=jon" | head -n 30
else
    echo -e "${RED}✗ Search endpoint failed with HTTP $SEARCH_RESPONSE${NC}"
fi

echo -e "\n${YELLOW}2.4 Testing contestant details endpoint${NC}"
DETAILS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:4000/contestants/runner-1")
if [ "$DETAILS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Contestant details endpoint returned HTTP 200${NC}"
    echo "Details sample:"
    curl -s "http://localhost:4000/contestants/runner-1" | grep -o '"name":"[^"]*"'
else
    echo -e "${RED}✗ Contestant details endpoint failed with HTTP $DETAILS_RESPONSE${NC}"
fi

# Check frontend accessibility
echo -e "\n${YELLOW}3. Testing Frontend Accessibility${NC}"
FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001)
if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Frontend is accessible at http://localhost:3001${NC}"
else
    echo -e "${RED}✗ Frontend is not accessible at http://localhost:3001 (HTTP $FRONTEND_RESPONSE)${NC}"
fi

# Check nginx accessibility
echo -e "\n${YELLOW}4. Testing Nginx Proxy${NC}"
NGINX_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
if [ "$NGINX_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ Nginx proxy is accessible at http://localhost${NC}"
else
    echo -e "${RED}✗ Nginx proxy is not accessible at http://localhost (HTTP $NGINX_RESPONSE)${NC}"
fi

echo -e "\n${GREEN}===== Test Summary =====\n${NC}"
echo -e "Frontend URL: http://localhost:3001"
echo -e "Backend API: http://localhost:4000"
echo -e "Nginx proxy: http://localhost"
echo -e "\nOpen one of these URLs in your browser to view the application"
echo -e "To see application logs, run: docker compose logs -f"
echo -e "${GREEN}===== Tests Completed =====\n${NC}"
