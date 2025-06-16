const axios = require('axios');
const cheerio = require('cheerio');
const { 
  mockRaces, 
  mockRaceResults, 
  mockContestantDetails,
  searchMockContestants,
  getMockContestantById
} = require('./mockData');

// Base URL for timataka.net
const BASE_URL = 'https://timataka.net';

// Flag to control whether to use mock data (useful for development and testing)
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true' || process.env.NODE_ENV === 'development';

/**
 * Get list of latest races from timataka.net home page
 * @param {number} limit - Maximum number of races to return
 * @returns {Promise<Array>} Array of race information
 */
async function getLatestRaces(limit = 10) {
  // If using mock data, return mock races
  if (USE_MOCK_DATA) {
    console.log('Using mock race data instead of scraping');
    return mockRaces.slice(0, limit);
  }

  try {
    const response = await axios.get(BASE_URL);
    const html = response.data;
    const $ = cheerio.load(html);
    
    const races = [];
    
    // Find all race links on the homepage with multiple possible selectors
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
            url: fullUrl
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
            url: raceLink.startsWith('http') ? raceLink : `${BASE_URL}${raceLink}`
          });
        }
      });
    }
    
    return races;
  } catch (error) {
    console.error('Error getting latest races:', error);
    
    // If scraping fails, use mock data as fallback
    console.log('Using mock race data due to scraping error:', error.message);
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
  // If using mock data, return mock race results filtered by race ID if provided
  if (USE_MOCK_DATA) {
    console.log('Using mock race results data');
    if (raceId) {
      return mockRaceResults.filter(result => result.raceId === raceId);
    }
    return mockRaceResults;
  }
  
  try {
    // If no specific race is provided, get the latest race
    let raceUrl = '';
    
    if (!raceId) {
      try {
        const latestRaces = await getLatestRaces(1);
        if (latestRaces.length > 0) {
          raceUrl = latestRaces[0].url;
        } else {
          // Fallback to a hardcoded recent race URL if no races found
          console.log('No races found with scraper, using fallback race URL');
          raceUrl = `${BASE_URL}/results`;
        }
      } catch (error) {
        console.log('Error getting latest races, using fallback race URL', error);
        raceUrl = `${BASE_URL}/results`;
      }
    } else {
      raceUrl = `${BASE_URL}/${raceId}/urslit/`;
      if (categoryId) {
        raceUrl += `?race=${categoryId}&cat=overall`;
      }
    }
    
    const response = await axios.get(raceUrl);
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
      const nameLink = $(tds[1]).find('a');
      if (nameLink.length > 0) {
        const href = nameLink.attr('href');
        if (href) {
          // Extract ID from URL pattern like ?participant=123
          const match = href.match(/[?&]participant=([^&]+)/);
          if (match && match[1]) {
            contestantId = match[1];
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
        
        const contestant = {
          id: `${raceId}-${position}-${name}`.replace(/\s+/g, '-').toLowerCase(),
          position,
          name,
          bib,
          club,
          category,
          time,
          raceId: raceId,
          raceName: $('h1').text().trim() || ''
        };
        
        results.push(contestant);
      });
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
  // If using mock data, return mock contestant details
  if (USE_MOCK_DATA) {
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
      const response = await axios.get(detailsUrl);
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
      
      const details = {
        id: contestantId,
        name,
        bib,
        category,
        club,
        finalTime,
        timeSplits,
        totalCheckpoints: timeSplits.length,
        lastUpdate: new Date().toISOString(),
        status: finalTime ? 'Finished' : (timeSplits.length > 0 ? 'In progress' : 'Not started')
      };
      
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
  // If using mock data, search through mock race results
  if (USE_MOCK_DATA) {
    console.log('Using mock data for contestant search');
    return searchMockContestants(name);
  }
  
  try {
    // Since timataka.net doesn't have a direct search API that we can use,
    // we'll get recent races and search through their results
    const races = await getLatestRaces(5); // Get the 5 most recent races
    const allResults = [];
    
    // Search through each race's results
    for (const race of races) {
      const results = await scrapeRaceResults(race.id);
      allResults.push(...results);
    }
    
    // Filter results by name
    const normalizedSearchName = name.toLowerCase();
    const filteredResults = allResults.filter(contestant => 
      contestant.name.toLowerCase().includes(normalizedSearchName)
    );
    
    // Remove duplicates (same person might be in multiple races)
    const uniqueResults = [];
    const seenNames = new Set();
    
    for (const contestant of filteredResults) {
      // Create a unique key combining name and club to better identify unique contestants
      const uniqueKey = `${contestant.name}|${contestant.club || ''}`;
      
      if (!seenNames.has(uniqueKey)) {
        seenNames.add(uniqueKey);
        uniqueResults.push(contestant);
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
  searchContestants
};
