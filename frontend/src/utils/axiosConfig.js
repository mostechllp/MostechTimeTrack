import axios from 'axios';

// Determine the API URL based on environment
const getApiUrl = () => {
  // Check if we're on a deployed site (not localhost)
  const isDeployed = window.location.hostname !== 'localhost' && 
                     !window.location.hostname.includes('127.0.0.1');
  
  if (isDeployed) {
    // Always use Render backend when deployed
    return 'https://mos-attendance.onrender.com/api';
  }
  
  // Local development
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api';
};

const API_URL = getApiUrl();

console.log('API URL:', API_URL); 

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
   headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      if (user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear local storage and redirect to login
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;