#!/bin/bash
# Script to find past events with race data

echo "Searching for past events with race data..."
echo "========================================"
echo

# Get the latest events
EVENTS=$(curl -s "http://localhost:4000/events" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

# Try testing each event for race data
for event in $EVENTS; do
  echo -n "Testing event $event: "
  result=$(curl -s "http://localhost:4000/races?eventId=$event")
  
  if [[ "$result" == "[]" ]]; then
    echo "No races found"
  else
    echo "FOUND RACES!"
    echo "Event with races: $event"
    echo "Race data: $result" | head -c 100
    echo "..."
    break
  fi
done

echo
echo "Trying some known past events that might have race data:"

# Test some hardcoded past event IDs that might have race data
PAST_EVENTS=("reykjavik-marathon-2019" "reykjavik-marathon-2020" "reykjavik-marathon-2021" "vormarathon2020" "vormarathon2021" "vormarathon2022")

for event in "${PAST_EVENTS[@]}"; do
  echo -n "Testing past event $event: "
  result=$(curl -s "http://localhost:4000/races?eventId=$event")
  
  if [[ "$result" == "[]" ]]; then
    echo "No races found"
  else
    echo "FOUND RACES!"
    echo "Event with races: $event"
    echo "Race data: $result" | head -c 100
    echo "..."
    break
  fi
done

echo
echo "If no events with races were found, try switching to mock data:"
echo "./toggle-data-source.sh mock"
echo "docker compose restart backend"
