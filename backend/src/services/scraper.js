// filepath: /Users/som/Code/timataka/backend/src/services/scraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Configure axios to ignore SSL certificate errors
const httpsAgent = new https.Agent({
  rejectUnauthorized: false // Ignore SSL certificate issues
});
const { 
  mockRaces, 
  mockRaceResults, 
  mockContestantDetails,
  searchMockContestants,
  getMockContestantById,
  mockEvents
} = require('./mockData');

// Base URL for timataka.net
const BASE_URL = 'https://timataka.net';

// Flag to control whether to use mock data (useful for development and testing)
// Simplified logic: if USE_MOCK_DATA is 'false', use real data, otherwise use mock data
const USE_MOCK_DATA = process.env.USE_MOCK_DATA !== 'false';

// Variable to track if timataka.net is accessible
let timatakaAccessible = true;

// Cache configuration
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';
const CACHE_DIR = path.join(__dirname, '../../../data/cache');
const CACHE_TTL = 3600 * 1000; // Cache time-to-live: 1 hour in milliseconds
const MAX_RETRIES = 3; // Maximum number of retries for network requests

// Create cache directory if it doesn't exist
if (CACHE_ENABLED) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      console.log(`Created cache directory: ${CACHE_DIR}`);
    }
  } catch (error) {
    console.error(`Error creating cache directory: ${error.message}`);
  }
}

// Cache functions
function getCacheFilePath(key) {
  // Generate a safe filename from the cache key
  const safeName = Buffer.from(key).toString('base64').replace(/[/+=]/g, '_');
  return path.join(CACHE_DIR, `${safeName}.json`);
}

function getFromCache(key) {
  if (!CACHE_ENABLED) return null;
  
  try {
    const cacheFile = getCacheFilePath(key);
    if (!fs.existsSync(cacheFile)) return null;
    
    const data = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    const now = Date.now();
    
    // Check if cache is still valid
    if (data.timestamp && (now - data.timestamp) < CACHE_TTL) {
      console.log(`Cache hit for: ${key}`);
      return data.value;
    }
    
    // Cache expired
    console.log(`Cache expired for: ${key}`);
    return null;
  } catch (error) {
    console.error(`Cache read error for ${key}: ${error.message}`);
    return null;
  }
}

function saveToCache(key, value) {
  if (!CACHE_ENABLED) return;
  
  try {
    const cacheFile = getCacheFilePath(key);
    const data = {
      timestamp: Date.now(),
      value
    };
    
    fs.writeFileSync(cacheFile, JSON.stringify(data), 'utf8');
    console.log(`Cached data for: ${key}`);
  } catch (error) {
    console.error(`Cache write error for ${key}: ${error.message}`);
  }
}

// Enhanced axios request with retry logic
async function makeRequest(url, options = {}) {
  let lastError = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`Retry attempt ${attempt} for: ${url}`);
      }
      
      const response = await axios({
        url,
        ...options,
        httpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          ...(options.headers || {})
        }
      });
      
      return response;
    } catch (error) {
      lastError = error;
      console.error(`Request error (attempt ${attempt}/${MAX_RETRIES}): ${error.message}`);
      
      // If this is a server error (5xx), or network error, retry
      const shouldRetry = !error.response || error.response.status >= 500;
      if (!shouldRetry || attempt === MAX_RETRIES) break;
      
      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error(`Failed after ${MAX_RETRIES} attempts`);
}

// Function to check if timataka.net is accessible
async function checkTimataka() {
  // Use cache to avoid checking too frequently
  const cacheKey = 'timataka_access_check';
  const cachedResult = getFromCache(cacheKey);
  if (cachedResult !== null) {
    timatakaAccessible = cachedResult;
    return cachedResult;
  }
  
  if (!timatakaAccessible) {
    console.log('Previously detected timataka.net was not accessible, using mock data');
    // Still try again after a period to see if it's come back online
    const lastCheck = getFromCache('timataka_last_failed_check');
    const now = Date.now();
    if (lastCheck && (now - lastCheck.timestamp) < 300000) { // 5 minutes
      return false;
    }
    console.log('Trying again to see if timataka.net is now accessible...');
  }
  
  try {
    await makeRequest(BASE_URL, { timeout: 5000 });
    timatakaAccessible = true;
    saveToCache(cacheKey, true);
    console.log('Successfully connected to timataka.net');
    return true;
  } catch (error) {
    console.log('Cannot access timataka.net, will use mock data:', error.message);
    timatakaAccessible = false;
    saveToCache(cacheKey, false);
    saveToCache('timataka_last_failed_check', { timestamp: Date.now() });
    return false;
  }
}

/**
 * Get list of events from timataka.net
 * @param {number} limit - Maximum number of events to return
 * @returns {Promise<Array>} Array of event information
 */
async function getEvents(limit = 10) {
  // If using mock data or timataka is not accessible, return mock events
  if (USE_MOCK_DATA || !(await checkTimataka())) {
    console.log('Using mock event data instead of scraping');
    return mockEvents.slice(0, limit);
  }
  
  console.log('Fetching real events from timataka.net');

  // Check cache first
  const cacheKey = `events_limit${limit}`;
  const cachedEvents = getFromCache(cacheKey);
  if (cachedEvents) {
    console.log('Using cached event data');
    return cachedEvents;
  }

  try {
    const response = await makeRequest(BASE_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    const events = [];
    
    // Find all event links on the homepage
    const selectors = ['.events-list a', '.featured-events a', 'section.events a'];
    
    // Try each selector until we find events
    for (const selector of selectors) {
      $(selector).each((i, element) => {
        if (events.length >= limit) return false;
        
        const eventLink = $(element).attr('href');
        const eventName = $(element).text().trim();
        let eventDate = '';
        
        // Try to find an associated date near the event link
        const dateElement = $(element).closest('div').find('.event-date');
        if (dateElement.length > 0) {
          eventDate = dateElement.text().trim();
        }
        
        if (eventLink && eventName) {
          // Make sure we have a full URL
          const fullUrl = eventLink.startsWith('http') ? eventLink : 
                          eventLink.startsWith('/') ? `${BASE_URL}${eventLink}` : 
                          `${BASE_URL}/${eventLink}`;
          
          // Extract the event ID from the URL
          let eventId;
          if (fullUrl.includes('timataka.net/')) {
            const parts = fullUrl.split('/').filter(Boolean);
            eventId = parts[parts.length - 1] || parts[parts.length - 2];
          } else {
            eventId = `event-${events.length + 1}`; // Fallback ID
          }
          
          events.push({
            id: eventId,
            name: eventName,
            date: eventDate,
            url: fullUrl
          });
        }
      });
      
      // If we found events with this selector, no need to try others
      if (events.length > 0) {
        break;
      }
    }
    
    // If no events found with specific selectors, look for any links that might be events
    if (events.length === 0) {
      $('a').each((i, element) => {
        if (events.length >= limit) return false;
        
        const eventLink = $(element).attr('href');
        const eventName = $(element).text().trim();
        
        if (eventLink && eventName && (eventLink.includes('/event/') || eventName.includes('Marathon') || eventName.includes('Run'))) {
          const eventId = eventLink.split('/').filter(Boolean).pop();
          
          events.push({
            id: eventId || `event-${events.length + 1}`,
            name: eventName,
            date: new Date().toISOString().split('T')[0], // Default to current date if date not found
            url: eventLink.startsWith('http') ? eventLink : `${BASE_URL}${eventLink}`
          });
        }
      });
    }
    
    // Save to cache before returning
    saveToCache(cacheKey, events);
    return events;
  } catch (error) {
    console.error('Error getting events:', error);
    
    // If scraping fails, use mock data as fallback
    console.log('Using mock event data due to scraping error:', error.message);
    return mockEvents.slice(0, limit);
  }
}

/**
 * Get list of latest races from timataka.net home page
 * @param {number} limit - Maximum number of races to return
 * @param {string} eventId - Optional event ID to filter races
 * @returns {Promise<Array>} Array of race information
 */
async function getLatestRaces(limit = 10, eventId = null) {
  // If using mock data or timataka is not accessible, return mock races
  if (USE_MOCK_DATA || !(await checkTimataka())) {
    console.log('Using mock race data instead of scraping');
    if (eventId) {
      return mockRaces.filter(race => race.eventId === eventId).slice(0, limit);
    }
    return mockRaces.slice(0, limit);
  }
  
  console.log(`Fetching real races from timataka.net ${eventId ? `for event ${eventId}` : ''}`);
  

  try {
    // If eventId is provided, we'll try to get races for that specific event
    let raceUrl = BASE_URL;
    if (eventId) {
      raceUrl = `${BASE_URL}/${eventId}/`;
    }
    
    const response = await axios.get(raceUrl);
    const html = response.data;
    const $ = cheerio.load(html);
    
    const races = [];
    
    // Find all race links on the page with multiple possible selectors
    const selectors = ['h3 + ul li a', 'ul.races li a', 'div.races a', 'a.race-link', '.upcoming-races a', '.recent-races a'];
    
    // Try each selector until we find races
    for (const selector of selectors) {
      $(selector).each((i, element) => {
        if (races.length >= limit) return false; // Break the loop once we hit the limit
        
        const raceLink = $(element).attr('href');
        const raceName = $(element).text().trim();
        
        if (raceLink && raceName) {
          // Make sure we have a full URL
          const fullUrl = raceLink.startsWith('http') ? raceLink : 
                          raceLink.startsWith('/') ? `${BASE_URL}${raceLink}` : 
                          `${BASE_URL}/${raceLink}`;
          
          // Extract the race ID from the URL - we need to handle different URL formats
          let raceId;
          if (fullUrl.includes('timataka.net/')) {
            const parts = fullUrl.split('/').filter(Boolean);
            raceId = parts[parts.length - 1] || parts[parts.length - 2];
          } else {
            raceId = `race-${races.length + 1}`; // Fallback ID
          }
          
          races.push({
            id: raceId,
            name: raceName,
            url: fullUrl,
            eventId: eventId // Associate race with event
          });
        }
      });
      
      // If we found races with this selector, no need to try others
      if (races.length > 0) {
        break;
      }
    }
    
    // If no races found with specific selectors, look for any links that might be races
    if (races.length === 0) {
      $('a').each((i, element) => {
        if (races.length >= limit) return false;
        
        const raceLink = $(element).attr('href');
        const raceName = $(element).text().trim();
        
        if (raceLink && raceName && raceLink.includes('/urslit/')) {
          const raceId = raceLink.split('/').filter(Boolean).find(part => part !== 'urslit');
          
          races.push({
            id: raceId || `race-${races.length + 1}`,
            name: raceName,
            url: raceLink.startsWith('http') ? raceLink : `${BASE_URL}${raceLink}`,
            eventId: eventId // Associate race with event
          });
        }
      });
    }
    
    return races;
  } catch (error) {
    console.error('Error getting latest races:', error);
    
    // If scraping fails, use mock data as fallback
    console.log('Using mock race data due to scraping error:', error.message);
    if (eventId) {
      return mockRaces.filter(race => race.eventId === eventId).slice(0, limit);
    }
    return mockRaces.slice(0, limit);
  }
}

/**
 * Get race categories for a specific race
 * @param {string} raceId - The race ID
 * @returns {Promise<Array>} Array of race categories
 */
async function getRaceCategories(raceId) {
  try {
    const response = await axios.get(`${BASE_URL}/${raceId}/`);
    const html = response.data;
    const $ = cheerio.load(html);
    
    const categories = [];
    
    // Find all race categories on the race page
    $('h4').each((i, element) => {
      const categoryName = $(element).text().trim();
      if (categoryName) {
        // Look for the links that follow the category header
        const links = $(element).next().find('a');
        if (links.length > 0) {
          const categoryLinks = [];
          links.each((j, linkElement) => {
            const href = $(linkElement).attr('href');
            const text = $(linkElement).text().trim();
            if (href && text) {
              categoryLinks.push({
                url: href,
                text: text
              });
            }
          });
          
          categories.push({
            name: categoryName,
            links: categoryLinks
          });
        }
      }
    });
    
    return categories;
  } catch (error) {
    console.error(`Error getting race categories for ${raceId}:`, error);
    throw new Error('Failed to get race categories');
  }
}

/**
 * Scrape race results from timataka.net
 * @param {string} raceId - The race ID
 * @param {string} categoryId - The category ID (optional)
 * @returns {Promise<Array>} Array of race results
 */
async function scrapeRaceResults(raceId = '', categoryId = '') {
  // If using mock data or timataka is not accessible, return mock race results
  if (USE_MOCK_DATA || !(await checkTimataka())) {
    console.log('Using mock race results data');
    if (raceId) {
      return mockRaceResults.filter(result => result.raceId === raceId);
    }
    return mockRaceResults;
  }
  
  console.log(`Fetching real race results for ${raceId || 'latest race'}`);
  
  // Check cache first
  const cacheKey = `race_results_${raceId}_${categoryId}`;
  const cachedResults = getFromCache(cacheKey);
  if (cachedResults) {
    console.log(`Using cached race results for ${raceId || 'latest race'}`);
    return cachedResults;
  }
  
  try {
    // If no specific race is provided, get the latest race
    let raceUrl = '';
    
    if (!raceId) {
      try {
        const latestRaces = await getLatestRaces(1);
        if (latestRaces.length > 0) {
          raceUrl = latestRaces[0].url;
          console.log(`Using latest race URL: ${raceUrl}`);
        } else {
          // Fallback to a hardcoded recent race URL if no races found
          console.log('No races found with scraper, using fallback race URL');
          raceUrl = `${BASE_URL}/results`;
          console.log(`Using fallback race URL: ${raceUrl}`);
        }
      } catch (error) {
        console.log('Error getting latest races, using fallback race URL', error);
        raceUrl = `${BASE_URL}/results`;
        console.log(`Using fallback race URL after error: ${raceUrl}`);
      }
    } else {
      raceUrl = `${BASE_URL}/${raceId}/urslit/`;
      if (categoryId) {
        raceUrl += `?race=${categoryId}&cat=overall`;
      }
    }
    
    const response = await makeRequest(raceUrl);
    const html = response.data;
    const $ = cheerio.load(html);
    
    const results = [];
    
    // Find the results table
    $('.results-table tr').each((i, element) => {
      if (i === 0) return; // Skip header row
      
      const tds = $(element).find('td');
      if (tds.length < 5) return; // Skip rows with insufficient data
      
      // Extract the contestant ID from the URL if available
      let contestantId = '';
      let birthYear = '';
      const nameLink = $(tds[1]).find('a');
      if (nameLink.length > 0) {
        const href = nameLink.attr('href');
        if (href) {
          // Extract ID from URL pattern like ?participant=123
          const match = href.match(/[?&]participant=([^&]+)/);
          if (match && match[1]) {
            contestantId = match[1];
          }
          
          // Try to extract birth year from title attribute or other attributes
          const title = nameLink.attr('title') || '';
          const birthYearMatch = title.match(/\b(19|20)\d{2}\b/);
          if (birthYearMatch) {
            birthYear = birthYearMatch[0];
          }
        }
      }
      
      // If we couldn't find the birth year in the title, try to look for it in the name or other fields
      if (!birthYear) {
        // Sometimes birth year is in parentheses after the name: "John Doe (1985)"
        const nameText = $(tds[1]).text().trim();
        const birthYearMatch = nameText.match(/\((\d{4})\)/);
        if (birthYearMatch) {
          birthYear = birthYearMatch[1];
        }
        
        // Sometimes it's in a separate column or within the category column
        if (!birthYear && tds.length >= 5) {
          const categoryText = $(tds[4]).text().trim();
          const ageMatch = categoryText.match(/\b(19|20)\d{2}\b/);
          if (ageMatch) {
            birthYear = ageMatch[0];
          }
        }
      }
      
      const contestant = {
        id: contestantId || `${raceId}-${i}`, // Fall back to a generated ID if none is found
        position: $(tds[0]).text().trim(),
        name: $(tds[1]).text().trim(),
        bib: $(tds[2]).text().trim() || '',
        club: $(tds[3]).text().trim() || '',
        category: $(tds[4]).text().trim() || '',
        time: $(tds[5]).text().trim() || '',
        birthYear: birthYear || null,
        raceId: raceId,
        raceName: $('h1').text().trim() || ''
      };
      
      results.push(contestant);
    });
    
    // If no results were found in the standard format, try an alternative parsing approach
    if (results.length === 0) {
      $('.dataTable tr').each((i, element) => {
        if (i === 0) return; // Skip header row
        
        const tds = $(element).find('td');
        if (tds.length < 3) return; // Skip rows with insufficient data
        
        // Generate an ID based on name and position
        const position = $(tds[0]).text().trim();
        const name = $(tds[1]).text().trim();
        const bib = $(tds[2]).text().trim() || '';
        const club = tds.length >= 4 ? $(tds[3]).text().trim() : '';
        const category = tds.length >= 5 ? $(tds[4]).text().trim() : '';
        const time = tds.length >= 6 ? $(tds[5]).text().trim() : '';
        
        // Try to extract birth year from the name or category
        let birthYear = '';
        const birthYearMatch = name.match(/\((\d{4})\)/) || category.match(/\b(19|20)\d{2}\b/);
        if (birthYearMatch) {
          birthYear = birthYearMatch[1] || birthYearMatch[0];
        }
        
        const contestant = {
          id: `${raceId}-${position}-${name}`.replace(/\s+/g, '-').toLowerCase(),
          position,
          name,
          bib,
          club,
          category,
          time,
          birthYear: birthYear || null,
          raceId: raceId,
          raceName: $('h1').text().trim() || ''
        };
        
        results.push(contestant);
      });
    }
    
    // Save to cache if we found any results
    if (results.length > 0) {
      saveToCache(cacheKey, results);
      console.log(`Saved ${results.length} race results to cache for ${raceId || 'latest race'}`);
    }
    
    return results;
  } catch (error) {
    console.error('Error scraping race results:', error);
    
    // Use mock data as fallback
    console.log('Using mock race results data due to scraping error');
    if (raceId) {
      return mockRaceResults.filter(result => result.raceId === raceId);
    }
    return mockRaceResults;
  }
}

/**
 * Scrape contestant details from timataka.net
 * @param {string} contestantId Contestant ID or combined race-position-name
 * @param {string} raceId Optional race ID if contestantId doesn't contain the full information
 * @returns {Promise<Object>} Contestant details
 */
async function scrapeContestantDetails(contestantId, raceId = '') {
  // If using mock data or timataka is not accessible, return mock contestant details
  if (USE_MOCK_DATA || !(await checkTimataka())) {
    console.log('Using mock contestant details data');
    const contestant = getMockContestantById(contestantId);
    if (contestant) {
      return contestant;
    }
    // If contestant not found in mock data, return a generic contestant
    return {
      id: contestantId,
      name: `Contestant ${contestantId}`,
      bib: "123",
      category: "Open",
      club: "Running Club",
      finalTime: "01:23:45",
      timeSplits: [],
      totalCheckpoints: 0,
      lastUpdate: new Date().toISOString(),
      status: "Finished"
    };
  }
  
  console.log(`Fetching real contestant details for ID ${contestantId}`);
  
  // Check cache first
  const cacheKey = `contestant_details_${contestantId}_${raceId}`;
  const cachedDetails = getFromCache(cacheKey);
  if (cachedDetails) {
    console.log(`Using cached details for contestant ${contestantId}`);
    return cachedDetails;
  }
  

  try {
    // If the contestant ID is in the format raceId-position-name
    // we need to find the actual contestant page by searching the race results
    let detailsUrl = '';
    
    if (contestantId.includes('-')) {
      // This is likely a generated ID from our system
      // We need to find the contestant in the race results first
      const raceResults = await scrapeRaceResults(raceId || contestantId.split('-')[0]);
      const contestant = raceResults.find(c => c.id === contestantId);
      
      if (!contestant) {
        throw new Error(`Contestant with ID ${contestantId} not found in race results`);
      }
      
      // There's no direct way to access contestant details if we don't have a real ID
      // So we'll return the race result data with some enhancements
      return {
        ...contestant,
        timeSplits: [],
        lastUpdate: new Date().toISOString(),
        totalCheckpoints: 0,
        status: contestant.time ? 'Finished' : 'Unknown'
      };
    } else {
      // This is a real contestant ID
      detailsUrl = `${BASE_URL}/participant/?participant=${contestantId}`;
      const response = await makeRequest(detailsUrl);
      const html = response.data;
      const $ = cheerio.load(html);
      
      // Try to extract contestant details
      const name = $('h1').text().trim() || '';
      
      // Look for time splits table
      const timeSplits = [];
      $('.splits-table tr, .results-table tr').each((i, element) => {
        if (i === 0) return; // Skip header row
        
        const tds = $(element).find('td');
        if (tds.length >= 3) {
          const split = {
            checkpoint: $(tds[0]).text().trim(),
            distance: $(tds[1]).text().trim() || '',
            splitTime: $(tds[2]).text().trim() || '',
            time: $(tds[3]).text().trim() || '',
            position: $(tds[4]).text().trim() || ''
          };
          
          timeSplits.push(split);
        }
      });
      
      // Extract other information like bib, category, etc.
      const bib = $('.contestant-details .bib').text().trim() || '';
      const category = $('.contestant-details .category').text().trim() || '';
      const club = $('.contestant-details .club').text().trim() || '';
      const finalTime = $('.contestant-details .time').text().trim() || '';
      
      // Try to find birth year in the page
      let birthYear = '';
      $('.contestant-details').each(function() {
        const text = $(this).text();
        const match = text.match(/\b(19|20)\d{2}\b/); // Look for a 4-digit year starting with 19 or 20
        if (match) {
          birthYear = match[0];
        }
      });
      
      const details = {
        id: contestantId,
        name,
        bib,
        category,
        club,
        birthYear: birthYear || null,
        finalTime,
        timeSplits,
        totalCheckpoints: timeSplits.length,
        lastUpdate: new Date().toISOString(),
        status: finalTime ? 'Finished' : (timeSplits.length > 0 ? 'In progress' : 'Not started')
      };
      
      // Save to cache
      saveToCache(cacheKey, details);
      
      return details;
    }
  } catch (error) {
    console.error(`Error scraping contestant details for ID ${contestantId}:`, error);
    
    // Use mock data as fallback
    console.log('Using mock contestant details data due to scraping error');
    const contestant = getMockContestantById(contestantId);
    if (contestant) {
      return contestant;
    }
    
    // If contestant not found in mock data, return a generic contestant
    return {
      id: contestantId,
      name: `Contestant ${contestantId}`,
      bib: "123",
      category: "Open",
      club: "Running Club",
      finalTime: "01:23:45",
      timeSplits: [],
      totalCheckpoints: 0,
      lastUpdate: new Date().toISOString(),
      status: "Error fetching details",
      error: error.message
    };
  }
}

/**
 * Search for contestants by name
 * @param {string} name Name to search for
 * @returns {Promise<Array>} Array of matching contestants
 */
async function searchContestants(name) {
  if (!name) {
    return [];
  }
  
  // If using mock data or timataka is not accessible, use the mock search function
  if (USE_MOCK_DATA || !(await checkTimataka())) {
    console.log('Using mock data for contestant search');
    return searchMockContestants(name);
  }
  
  console.log(`Searching for contestants matching "${name}" from timataka.net`);
  
  
  try {
    // Since timataka.net doesn't have a direct search API that we can use,
    // we'll get recent races and search through their results
    const races = await getLatestRaces(5); // Get the 5 most recent races
    const allResults = [];
    
    // Search through each race's results
    for (const race of races) {
      console.log(`Searching race ${race.id} (${race.name || 'unnamed'}) for contestant "${name}"`);
      const results = await scrapeRaceResults(race.id);
      console.log(`Found ${results.length} results in race ${race.id}`);
      allResults.push(...results);
    }
    
    console.log(`Total results across all races: ${allResults.length}`);
    
    // Filter results by name or name+birthYear
    let normalizedSearchName = name.toLowerCase();
    let searchBirthYear = '';
    
    // Check if search includes a birth year (formats like "John 1980" or "John (1980)")
    const birthYearMatch = name.match(/\b(19|20)\d{2}\b|\((\d{4})\)/);
    if (birthYearMatch) {
      searchBirthYear = birthYearMatch[1] || birthYearMatch[2] || birthYearMatch[0].replace(/[()]/g, '');
      // Remove the birth year from the search name for better name matching
      normalizedSearchName = normalizedSearchName.replace(/\(\d{4}\)|\b(19|20)\d{2}\b/g, '').trim();
    }
    
    // First attempt: strict filtering with birth year if provided
    let filteredResults = allResults.filter(contestant => {
      const nameMatches = contestant.name.toLowerCase().includes(normalizedSearchName);
      
      // If search included a birth year, require both name and birth year to match
      if (searchBirthYear && contestant.birthYear) {
        return nameMatches && contestant.birthYear === searchBirthYear;
      }
      
      return nameMatches;
    });
    
    // If no results with exact birth year match, but we have a birth year search,
    // fall back to name-only search but add a note to the results
    if (filteredResults.length === 0 && searchBirthYear) {
      console.log(`No exact birth year matches for "${name}". Falling back to name-only search.`);
      
      filteredResults = allResults.filter(contestant => 
        contestant.name.toLowerCase().includes(normalizedSearchName)
      );
      
      // Add a note to the first result if any results were found
      if (filteredResults.length > 0) {
        filteredResults[0] = { 
          ...filteredResults[0],
          name: `${filteredResults[0].name} (Birth year ${searchBirthYear} not found)`
        };
      }
    }
    
    // Remove duplicates (same person might be in multiple races)
    const uniqueResults = [];
    const seenNames = new Set();
    
    for (const contestant of filteredResults) {
      try {
        // Create a unique key combining name, club and birth year to better identify unique contestants
        const uniqueKey = `${contestant.name}|${contestant.club || ''}|${contestant.birthYear || ''}`;
        
        if (!seenNames.has(uniqueKey)) {
          seenNames.add(uniqueKey);
          uniqueResults.push(contestant);
        }
      } catch (error) {
        console.error('Error processing contestant in search results:', error);
        // Skip this contestant if there was an error
      }
    }
    
    // Add diagnostic information when using real data
    if (!USE_MOCK_DATA) {
      console.log(`Found ${uniqueResults.length} unique results from ${filteredResults.length} total results`);
      
      // If we have very few results, expand search to categories
      if (uniqueResults.length === 0 && allResults.length > 0) {
        console.log('No results found, trying to search in categories as fallback');
        const categoryResults = allResults.filter(contestant => 
          contestant.category && contestant.category.toLowerCase().includes(normalizedSearchName)
        ).slice(0, 10);
        
        if (categoryResults.length > 0) {
          categoryResults[0] = { 
            ...categoryResults[0],
            name: `${categoryResults[0].name} (Matched category: ${categoryResults[0].category})`
          };
          return categoryResults;
        }
      }
    }
    
    return uniqueResults;
  } catch (error) {
    console.error(`Error searching for contestants with name "${name}":`, error);
    
    // Use mock data as fallback for search
    console.log('Using mock data for contestant search due to error');
    return searchMockContestants(name);
  }
}

module.exports = {
  getLatestRaces,
  getRaceCategories,
  scrapeRaceResults,
  scrapeContestantDetails,
  searchContestants,
  getEvents
};
