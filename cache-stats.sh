#!/bin/bash
# Script to show statistics about the cache

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}Timataka Cache Statistics${NC}"
echo "=========================="
echo

# Check if the cache directory exists
if [ -d "./data/cache" ]; then
  FILE_COUNT=$(find ./data/cache -type f | wc -l)
  echo -e "Cache directory: ${GREEN}Found${NC}"
  echo -e "Cache files: ${BLUE}${FILE_COUNT}${NC} files"
  
  # Get total size of all cache files
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CACHE_SIZE=$(du -h -d 0 ./data/cache | cut -f1)
  else
    # Linux
    CACHE_SIZE=$(du -h --max-depth=0 ./data/cache | cut -f1)
  fi
  
  echo -e "Cache size: ${BLUE}${CACHE_SIZE}${NC}"
  
  # List most recent files
  echo -e "\n${BOLD}Most recent cache files:${NC}"
  find ./data/cache -type f -name "*.json" | xargs ls -lt | head -n 5 | awk '{print $6, $7, $8, $9}'
else
  echo -e "${YELLOW}Cache directory does not exist.${NC}"
  echo "Creating cache directory..."
  mkdir -p ./data/cache
  echo -e "${GREEN}Cache directory created.${NC}"
fi

echo
echo -e "${BOLD}Cache Settings:${NC}"
CACHE_SETTING=$(docker exec timataka-backend-1 printenv CACHE_ENABLED 2>/dev/null || echo "unknown")
echo -e "CACHE_ENABLED: ${BLUE}${CACHE_SETTING}${NC}"

echo
echo -e "${BOLD}Cache activity from logs:${NC}"
CACHE_HITS=$(docker compose logs backend | grep -i "Cache hit for" | wc -l)
CACHE_MISSES=$(docker compose logs backend | grep -i "Cache expired for" | wc -l)
CACHE_SAVES=$(docker compose logs backend | grep -i "Cached data for" | wc -l)

echo -e "Cache hits: ${GREEN}${CACHE_HITS}${NC}"
echo -e "Cache misses: ${YELLOW}${CACHE_MISSES}${NC}"
echo -e "Cache saves: ${BLUE}${CACHE_SAVES}${NC}"

echo
echo -e "${BOLD}Most frequent cache keys:${NC}"
docker compose logs backend | grep -i "Cache hit for" | sed 's/.*Cache hit for: \(.*\)/\1/' | sort | uniq -c | sort -nr | head -n 5

echo
echo -e "${GREEN}Done!${NC}"
