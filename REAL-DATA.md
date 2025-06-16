# Using Real Data from timataka.net

This document explains how to use real data from timataka.net instead of mock data in the application.

## Overview

By default, the application uses mock data in development mode for stable testing and development. However, you can switch to real data from timataka.net when you want to see actual race results.

## Quick Start

1. Check current data source:
   ```bash
   ./data-status.sh
   ```

2. Switch to real data:
   ```bash
   ./toggle-data-source.sh real
   docker compose restart backend
   ```

3. Test the real data scraper:
   ```bash
   ./monitor-scraper.sh
   ```

4. To switch back to mock data:
   ```bash
   ./toggle-data-source.sh mock
   docker compose restart backend
   ```

## Switching Between Mock and Real Data

### Using the Toggle Script

We've created a script to easily switch between mock and real data:

```bash
# Switch to real data from timataka.net
./toggle-data-source.sh real

# Switch back to mock data
./toggle-data-source.sh mock
```

After changing the data source, restart the backend service:

```bash
docker compose restart backend
```

### Manual Configuration

If you prefer to manually configure the data source, edit the `docker-compose.yml` file:

1. For mock data:
   ```yaml
   environment:
     - NODE_ENV=development
     - USE_MOCK_DATA=true
   ```

2. For real data:
   ```yaml
   environment:
     - NODE_ENV=development
     - USE_MOCK_DATA=false
   ```

## Tools for Working with Real Data

We've created several tools to help you work with real data:

### Checking Current Status

The `data-status.sh` script shows your current data source and container status:

```bash
./data-status.sh
```

### Monitoring Real Data Performance

When using real data, you can monitor the scraper's performance with:

```bash
./monitor-scraper.sh
```

This script tests all API endpoints to verify that data is being correctly fetched from timataka.net.

### Testing Birth Year Extraction

To specifically test birth year extraction from timataka.net:

```bash
./test-scraper.sh
```

### Comparing Mock and Real Data

To compare how mock data and real data differ:

```bash
./compare-data.sh
```

This tool helps identify structural differences between mock data and real data, which is useful when updating mock data to match real-world data formats.

## Troubleshooting

### Common Issues with Real Data

1. **Website Structure Changes**: If timataka.net changes their HTML structure, the scraper might fail to extract data correctly. In this case, switch back to mock data until the scraper can be updated.

2. **Incomplete Data**: Some races or contestants might not have birth years available on timataka.net. The application will still work but may not show birth years for all contestants.

3. **Missing Data**: Some API endpoints (like search or race results for specific events) might return empty results when using real data, as timataka.net may not have the data or the structure might have changed. In these cases, the application will display a helpful message suggesting to switch back to mock data.

4. **Slow Performance**: Scraping real data is slower than using mock data, especially for searches that need to scrape multiple races.

### Resolving Issues

1. Use our diagnostics tool to identify and fix issues:
   ```bash
   ./timataka-diagnostics.sh
   ```
   This tool will check your configuration, test API endpoints, and look for scraping errors in the logs.

2. Check the Docker logs for error messages:
   ```bash
   docker compose logs backend
   ```

3. If you see scraping errors, switch back to mock data:
   ```bash
   ./toggle-data-source.sh mock
   docker compose restart backend
   ```

4. Verify that timataka.net is accessible by visiting the website in your browser.

5. If some features work with real data but others don't, the website structure might have changed for those specific features. You can continue using real data for the working features.

## Implementation Details

The scraper checks the `USE_MOCK_DATA` environment variable to decide whether to use mock data or fetch from timataka.net. When set to `false`, it performs real HTTP requests to timataka.net to scrape race results, contestant details, and event information.

### Cache System

To improve performance and reduce dependency on timataka.net, the system implements a caching mechanism:

- Successful responses from timataka.net are cached locally for 1 hour
- If timataka.net becomes unavailable, cached data will be used when possible
- This improves reliability and performance when using real data

The cache can be controlled with the `CACHE_ENABLED` environment variable:

```yaml
environment:
  - CACHE_ENABLED=true  # Enable cache (default)
  # or
  - CACHE_ENABLED=false # Disable cache
```

#### Cache Tools and Monitoring

We've created tools to help you manage and monitor the cache:

1. The main diagnostics tool includes cache statistics:
   ```bash
   ./timataka-diagnostics.sh
   ```

2. There's a dedicated cache statistics tool:
   ```bash
   ./cache-stats.sh
   ```
   
3. Cache data is stored in the `./data/cache` directory, which is mounted as a volume in the container.

4. If you want to clear the cache, you can remove the cache files:
   ```bash
   rm -rf ./data/cache/*
   ```
   
The cache significantly improves performance after the first request and ensures that your application remains functional even if timataka.net is temporarily unavailable.
