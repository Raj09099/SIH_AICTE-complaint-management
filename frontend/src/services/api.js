import axios from 'axios';

/**
 * Resolve and sanitize the Backend API Base URL.
 * Automatically handles:
 * 1. Default to live Render cloud backend if no env var is set.
 * 2. Appends '/api/v1' if omitted from the URL.
 * 3. Sanitizes duplicate slashes and typo corrections.
 */
const getSanitizedBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  if (!envUrl || envUrl.trim() === '') {
    return 'https://sih-aicte-complaint-management.onrender.com/api/v1';
  }

  let cleaned = envUrl.trim().replace(/\/+$/, '');

  // Auto-correct domain typo if present
  cleaned = cleaned.replace('-system.onrender.com', '.onrender.com');

  // Ensure path ends with /api/v1
  if (!cleaned.includes('/api/v1')) {
    if (cleaned.endsWith('/api')) {
      cleaned += '/v1';
    } else {
      cleaned += '/api/v1';
    }
  }

  return cleaned;
};

const API_BASE_URL = getSanitizedBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45-second timeout to handle Render free-tier cold-starts seamlessly
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
