# Timataka Results Web Application

A web application that scrapes race results from [timataka.net](https://timataka.net) and provides a better user interface.

> **New!** See [FEATURES.md](./FEATURES.md) for detailed documentation of our new event organization and birth year features.

## New Features in Detail

### Event Organization

The application now organizes races by events, providing a hierarchical view:
- **Events Page**: Browse all running events
- **Event Detail Page**: View all races within an event
- **Race Results Page**: See results for a specific race

### Birth Year Display

To better differentiate contestants with the same name:
- Birth years are now displayed next to contestant names in race results
- Birth years are shown on contestant detail pages
- Search functionality supports searching by name and birth year (e.g., "John 1985" or "John (1985)")

### Improved Search

The search feature has been enhanced to:
- Match contestants by both name and birth year when provided
- Use birth year to better identify unique contestants in results
- Display more accurate results when multiple people have the same namea better user interface. This application allows users to search for contestants by name and star their favorites to get live updates on their progress through time splits.

## Features

- Scrape race results from timataka.net in real-time
- Browse events and races organized by event
- Search for contestants by name with support for Icelandic characters
- Search with birth year to differentiate contestants with the same name (format: "John 1985" or "John (1985)")
- View birth years alongside contestant names for better identification
- Star your favorite contestants for quick access
- Get live updates on contestant progress through time splits (refreshed every 30 seconds)
- Responsive design for desktop and mobile with optimized table views
- Error resilient data scraping with fallback to mock data
- Pagination for large result sets

## Architecture

This project uses a dockerized environment with the following services:

- **Frontend**: React application with Material UI
- **Backend**: Node.js/Express API for scraping and serving data
- **Nginx**: Reverse proxy for routing requests

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Getting Started

1. Clone this repository
   ```
   git clone https://github.com/yourusername/timataka-results.git
   cd timataka-results
   ```

2. Start the application using Docker Compose
   ```
   docker compose up -d
   ```

3. Access the application
   - Web Interface: http://localhost or http://localhost:3001
   - API: http://localhost:4000 or http://localhost/api

## Development

### Running in development mode

```
docker compose up
```

### Configuration

The application is configured to use mock data in development mode, which makes it robust even when the timataka.net website structure changes or is unavailable. This behavior is controlled by environment variables in the Docker Compose file:

```yaml
environment:
  - NODE_ENV=development
  - USE_MOCK_DATA=true  # Set to false to always attempt real scraping
```

### Troubleshooting

If you encounter issues with the application, try these steps:

1. Check container logs for errors:
   ```
   docker compose logs backend
   docker compose logs frontend
   ```

2. If the frontend port 3000 is already in use on your machine, edit the `docker-compose.yml` file to use a different port:
   ```yaml
   frontend:
     ports:
       - "3001:3000"  # Change 3001 to another available port
   ```

3. If the race results are not loading, it could be due to changes in the timataka.net website structure. The application will automatically fall back to mock data, but you can check the backend logs for details.

4. Restart specific services after making changes:
   ```
   docker compose restart backend
   docker compose restart frontend
   ```

5. If search isn't working correctly, especially with Icelandic characters, make sure the searchMockContestants function in `backend/src/services/mockData.js` properly normalizes characters.

The containers are configured with hot-reloading so changes to the code will automatically refresh the application.

### Rebuilding containers after dependency changes

If you modify package.json files or other dependencies, rebuild the containers:

```
docker-compose up --build
```

## API Endpoints

- `GET /health` - Check API health status
- `GET /events` - Get all events
- `GET /races` - Get latest race results
- `GET /races?eventId=XYZ` - Get races for a specific event
- `GET /races?raceId=XYZ&categoryId=ABC` - Get results for a specific race and category
- `GET /contestants/:id` - Get details for a specific contestant
- `GET /search?name=XYZ` - Search for contestants by name (supports name with birth year format)

## Project Structure

```
.
├── docker-compose.yml   # Docker Compose configuration
├── frontend/           # React frontend
│   ├── Dockerfile      # Frontend Docker configuration
│   ├── package.json    # Frontend dependencies
│   └── src/            # Frontend source code
├── backend/            # Node.js backend
│   ├── Dockerfile      # Backend Docker configuration
│   ├── package.json    # Backend dependencies
│   └── src/            # Backend source code
└── nginx/              # Nginx configuration
    ├── Dockerfile      # Nginx Docker configuration
    └── nginx.conf      # Nginx configuration file
```

## API Endpoints

- `GET /api/races` - Get all race results
- `GET /api/contestants/:id` - Get details for a specific contestant
- `GET /api/search?name=<name>` - Search for contestants by name

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This application is for personal use only and relies on scraping data from timataka.net. It is not affiliated with or endorsed by timataka.net.
