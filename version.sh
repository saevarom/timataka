#!/bin/bash
# Version check script for timataka application

# Terminal colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Timataka Version Information =====\n${NC}"

# Application version
VERSION="1.0.0"
echo -e "${YELLOW}Application Version:${NC} $VERSION"
echo -e "${YELLOW}Build Date:${NC} $(date +"%Y-%m-%d")"
echo ""

# Check Node.js version
echo -e "${YELLOW}Checking Node.js versions:${NC}"
BACKEND_NODE=$(docker compose exec backend node --version 2>/dev/null || echo "Backend not running")
FRONTEND_NODE=$(docker compose exec frontend node --version 2>/dev/null || echo "Frontend not running")
echo -e "Backend Node.js: $BACKEND_NODE"
echo -e "Frontend Node.js: $FRONTEND_NODE"
echo ""

# Check npm dependencies
echo -e "${YELLOW}Backend dependencies:${NC}"
docker compose exec backend npm list --depth=0 | grep -E 'express|axios|cheerio' || echo "Cannot access backend dependencies"
echo ""

echo -e "${YELLOW}Frontend dependencies:${NC}"
docker compose exec frontend npm list --depth=0 | grep -E 'react|axios|material-ui' || echo "Cannot access frontend dependencies"
echo ""

# Check network configuration
echo -e "${YELLOW}Network Configuration:${NC}"
echo -e "Frontend mapped to: http://localhost:3001"
echo -e "Backend API mapped to: http://localhost:4000"
echo -e "Nginx proxy mapped to: http://localhost"
echo ""

# Show container status
echo -e "${YELLOW}Container Status:${NC}"
docker compose ps
echo ""

echo -e "${BLUE}===== End of Version Information =====\n${NC}"
echo -e "To run tests, execute: ${GREEN}./test.sh${NC}"
echo -e "To view logs, run: ${GREEN}docker compose logs -f${NC}"
