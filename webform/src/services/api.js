import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Your backend API URL
  headers: {
    'Content-Type': 'application/json',
  },
});

// Memory contributors API functions
export const submitContributor = async (contributorData) => {
  try {
    const response = await api.post('/memories/contributor', contributorData);
    return response.data;
  } catch (error) {
    console.error('Error submitting contributor:', error);
    throw error;
  }
};

// Memory submission API functions
export const uploadPhoto = async (file) => {
  try {
    const formData = new FormData();
    formData.append('photo', file);
    
    const response = await api.post('/memories/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw error;
  }
};

export const submitMemory = async (memoryData) => {
  try {
    const response = await api.post('/memories', memoryData);
    return response.data;
  } catch (error) {
    console.error('Error submitting memory:', error);
    throw error;
  }
};

// Function to get user info from token (if needed)
export const getUserFromToken = async (token) => {
  try {
    const response = await api.get(`/users/token/${token}`);
    return response.data;
  } catch (error) {
    console.error('Error getting user from token:', error);
    throw error;
  }
};

export default api;