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
 * Fetch all race results
 * @returns {Promise<Array>} Promise that resolves to an array of race results
 */
export const fetchRaceResults = async () => {
  try {
    const response = await api.get('/races');
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
