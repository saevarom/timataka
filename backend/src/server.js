const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { scrapeRaceResults, scrapeContestantDetails, searchContestants, getEvents, getLatestRaces } = require('./services/scraper');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API to get data source info
app.get('/data-source', (req, res) => {
  const isUsingMockData = process.env.USE_MOCK_DATA === 'true' || process.env.NODE_ENV === 'development';
  res.status(200).json({ 
    using_mock_data: isUsingMockData, 
    data_source: isUsingMockData ? 'mock' : 'timataka.net',
    env: process.env.NODE_ENV
  });
});

// API to get race results
app.get('/races', async (req, res) => {
  try {
    const { raceId, categoryId, eventId } = req.query;
    const isUsingMockData = process.env.USE_MOCK_DATA === 'true' || process.env.NODE_ENV === 'development';
    
    // Log additional diagnostic info about data source
    console.log(`/races endpoint called with params: raceId=${raceId || 'none'}, categoryId=${categoryId || 'none'}, eventId=${eventId || 'none'}`);
    console.log(`Using ${isUsingMockData ? 'MOCK' : 'REAL'} data source`);
    
    // If eventId is provided, get races for that event
    if (eventId) {
      const races = await getLatestRaces(50, eventId);
      
      // Add extra diagnostic info for empty real data results
      if (races.length === 0 && !isUsingMockData) {
        console.log(`No races found for event ${eventId} with real data source`);
      }
      
      return res.json(races);
    }
    
    // Otherwise get race results
    const results = await scrapeRaceResults(raceId, categoryId);
    
    // Add extra diagnostic info for empty real data results
    if (results.length === 0 && !isUsingMockData) {
      console.log(`No race results found for raceId=${raceId || 'none'}, categoryId=${categoryId || 'none'} with real data source`);
    }
    
    // The scraper now returns a default result on error
    res.json(results);
  } catch (error) {
    console.error('Error fetching race results:', error);
    // Provide a default response even on catastrophic errors
    res.json([{
      id: 'error',
      position: '-',
      name: 'Error fetching results',
      message: error.message,
      time: new Date().toISOString(),
      raceId: req.query.raceId || 'none',
      raceName: 'Error occurred',
      usingRealData: process.env.USE_MOCK_DATA !== 'true'
    }]);
  }
});

// API to get contestant details
app.get('/contestants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { raceId } = req.query;
    const contestantDetails = await scrapeContestantDetails(id, raceId);
    res.json(contestantDetails);
  } catch (error) {
    console.error('Error fetching contestant details:', error);
    // Return default contestant details on error
    res.json({
      id: id,
      name: 'Contestant details unavailable',
      bib: '-',
      category: '-',
      club: '-',
      finalTime: '-',
      timeSplits: [],
      totalCheckpoints: 0,
      lastUpdate: new Date().toISOString(),
      status: 'Error',
      error: error.message
    });
  }
});

// API to search for contestants
app.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    const isUsingMockData = process.env.USE_MOCK_DATA === 'true' || process.env.NODE_ENV === 'development';
    
    // Log additional diagnostic info
    console.log(`/search endpoint called with name: "${name || 'empty'}"`);
    console.log(`Using ${isUsingMockData ? 'MOCK' : 'REAL'} data source`);
    
    if (!name) {
      return res.status(400).json([{ 
        id: 'search-error',
        name: 'Search term required',
        message: 'Please provide a name to search for'
      }]);
    }
    
    // Use the dedicated search function instead of filtering race results
    // This provides better search capabilities across multiple races
    const searchResults = await searchContestants(name);
    
    // Add extra diagnostic info for empty real data results
    if (searchResults.length === 0 && !isUsingMockData) {
      console.log(`No search results found for "${name}" with real data source`);
    }
    
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching contestants:', error);
    // Provide a default response even on errors
    res.json([{
      id: 'search-error',
      position: '-',
      name: `No results for "${req.query.name || 'unknown'}"`,
      message: error.message,
      time: new Date().toISOString(),
      usingRealData: process.env.USE_MOCK_DATA !== 'true'
    }]);
  }
});

// API to get events
app.get('/events', async (req, res) => {
  try {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit) : 10;
    const events = await getEvents(limitNum);
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    // Provide a default response even on catastrophic errors
    res.json([{
      id: 'error',
      name: 'Error fetching events',
      message: error.message,
      date: new Date().toISOString().split('T')[0],
      url: '#'
    }]);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
