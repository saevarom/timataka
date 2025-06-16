# New Features Documentation

This document describes the new features that have been added to the Timataka Results Web Application.

## 1. Event Organization

Events are now the top-level organizational structure, with each event containing multiple races. This provides a more intuitive way to navigate through race results.

### Implementation Details:

- Added `getEvents()` function in backend to fetch and scrape events from timataka.net
- Created `/events` API endpoint to retrieve all events
- Added `/races?eventId=XYZ` endpoint to get races for a specific event
- Created new frontend pages:
  - `EventsPage.js`: Displays all events
  - `EventDetailPage.js`: Shows races within a selected event
- Updated navigation to include events in header and homepage

### Data Structure:

Events are structured as follows:
```javascript
{
  id: "reykjavik-marathon-2025",
  name: "Reykjavik Marathon 2025",
  date: "2025-08-23",
  url: "https://timataka.net/reykjavik-marathon-2025"
}
```

Races are now associated with events via `eventId`:
```javascript
{
  id: "reykjavik-marathon-2025-full",
  name: "42.2km Marathon",
  url: "https://timataka.net/reykjavik-marathon-2025-full",
  eventId: "reykjavik-marathon-2025"
}
```

## 2. Birth Year Display

Birth years are now displayed alongside contestant names to better differentiate runners with the same name.

### Implementation Details:

- Enhanced scraper to extract birth years from:
  - HTML title attributes
  - Name text in parentheses: "John Doe (1985)"
  - Category fields with year patterns
- Updated race results and contestant details display to show birth years
- Added birth years to mock data for testing

### Data Structure:

Contestants now include a birthYear field:
```javascript
{
  id: "runner-1",
  position: "1",
  name: "Jón Jónsson",
  bib: "101",
  birthYear: "1988",
  // other fields...
}
```

## 3. Enhanced Search Functionality

Search has been improved to support birth year searches and better identify unique contestants.

### Implementation Details:

- Added birth year parsing in search queries: "John 1985" or "John (1985)"
- Enhanced the search algorithm to prioritize exact birth year matches
- Implemented fallback to name-only search if no birth year matches are found
- Added search tips and placeholder text to the search input field
- Used birth years to better identify unique contestants

### Usage:

Users can search in the following formats:
- Regular name: "John Smith"
- Name with birth year: "John Smith 1985"
- Name with birth year in parentheses: "John Smith (1985)"

## Testing

To verify the birth year extraction functionality, run the test script:
```bash
./test-scraper.sh
```

This script tests the scraper's ability to extract birth years from timataka.net race results.
