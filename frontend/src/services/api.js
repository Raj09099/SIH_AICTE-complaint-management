import axios from 'axios';

/**
 * Configurable Axios instance pointing to the FastAPI backend.
 * Uses VITE_API_BASE_URL from environment variables, defaulting to local development port.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT auth token if stored
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sih26264_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for unified error and unauthenticated response handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      // localStorage.removeItem('sih26264_auth_token');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
export { API_BASE_URL };
