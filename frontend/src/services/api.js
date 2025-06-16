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
    return response.data;
  } catch (error) {
    console.error(`Error fetching races for event ${eventId}:`, error);
    throw new Error(error.response?.data?.error || 'Failed to fetch races for event');
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
    return response.data;
  } catch (error) {
    console.error('Error searching contestants:', error);
    throw new Error(error.response?.data?.error || 'Failed to search contestants');
  }
};

export default api;
