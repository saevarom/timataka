import axios from 'axios';

// Get the API URL from environment variables or use the default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch all events
 * @returns {Promise<Array>} Promise that resolves to an array of events
 */
export const fetchEvents = async () => {
  try {
    const response = await api.get('/events');
    return response.data;
  } catch (error) {
    console.error('Error fetching events:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch events');
  }
};

/**
 * Fetch all races for a specific event
 * @param {string} eventId - The event ID
 * @returns {Promise<Array>} Promise that resolves to an array of races
 */
export const fetchRacesByEvent = async (eventId) => {
  try {
    const response = await api.get(`/races?eventId=${eventId}`);
    
    // Check if we got an empty array but were expecting data
    if (Array.isArray(response.data) && response.data.length === 0) {
      console.warn(`No races found for event ${eventId}. This might indicate an issue with the data source.`);
    }
    
    return response.data;
  } catch (error) {
    console.error(`Error fetching races for event ${eventId}:`, error);
    
    // Enhanced error info
    let errorMessage = 'Failed to fetch races for this event';
    
    if (error.response) {
      if (error.response.status === 404) {
        errorMessage = `Event not found or unavailable from the current data source`;
      } else if (error.response.status === 500) {
        errorMessage = `Server error while fetching races. The data might not be available with the current settings.`;
      }
      
      // Include any specific error message from the server if available
      if (error.response.data?.error) {
        errorMessage += `: ${error.response.data.error}`;
      }
    } else if (error.request) {
      errorMessage = `Network error: Unable to reach the server. Please check your connection.`;
    }
    
    // Preserve the original error and response for component-level handling
    const enhancedError = new Error(errorMessage);
    enhancedError.originalError = error;
    enhancedError.response = error.response;
    
    throw enhancedError;
  }
};

/**
 * Fetch all race results
 * @param {string} raceId - Optional race ID to filter results
 * @returns {Promise<Array>} Promise that resolves to an array of race results
 */
export const fetchRaceResults = async (raceId = '') => {
  try {
    const url = raceId ? `/races?raceId=${encodeURIComponent(raceId)}` : '/races';
    const response = await api.get(url);
    
    // Check if we received empty results (likely using real data with no results)
    if (response.data && response.data.length === 0) {
      console.log(`Empty race results for race ${raceId || 'all races'}, checking data source`);
      
      // Check if we're using real data
      const dataSourceInfo = await fetchDataSourceInfo();
      
      // If we're using real data and got no results, log a more helpful message
      if (!dataSourceInfo.using_mock_data) {
        console.log('Empty race results from real data source. Real data may not contain this information.');
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching race results:', error);
    throw new Error(error.response?.data?.error || 'Failed to fetch race results');
  }
};

/**
 * Fetch details for a specific contestant
 * @param {string} id - The contestant ID
 * @returns {Promise<Object>} Promise that resolves to contestant details
 */
export const fetchContestantDetails = async (id) => {
  try {
    const response = await api.get(`/contestants/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching contestant ${id} details:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch contestant details');
  }
};

/**
 * Search for contestants by name
 * @param {string} name - The name to search for
 * @returns {Promise<Array>} Promise that resolves to an array of matching contestants
 */
export const searchContestants = async (name) => {
  try {
    const response = await api.get(`/search?name=${encodeURIComponent(name)}`);
    
    // Check if we received empty results (likely using real data with no results)
    if (response.data && response.data.length === 0) {
      console.log('Empty search results, checking data source');
      
      // Check if we're using real data
      const dataSourceInfo = await fetchDataSourceInfo();
      
      // If we're using real data and got no results, log a more helpful message
      if (!dataSourceInfo.using_mock_data) {
        console.log('Empty search results from real data source. Real data may not contain this information.');
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error searching contestants:', error);
    throw new Error(error.response?.data?.error || 'Failed to search contestants');
  }
};

/**
 * Fetch information about the current data source
 * @returns {Promise<Object>} Promise that resolves to data source information
 */
export const fetchDataSourceInfo = async () => {
  try {
    const response = await api.get('/data-source');
    return response.data;
  } catch (error) {
    console.error('Error fetching data source info:', error);
    return { 
      using_mock_data: true,
      data_source: 'mock (fallback)',
      error: error.message 
    };
  }
};

export default api;
