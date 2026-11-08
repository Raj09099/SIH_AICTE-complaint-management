import axios from 'axios';

const PRODUCTION_BACKEND = 'https://sih-aicte-complaint-management.onrender.com/api/v1';

/**
 * Resolve and sanitize the Backend API Base URL.
 * Priority:
 * 1. VITE_API_BASE_URL env var (set via .env.production on Vercel, or .env locally).
 * 2. Localhost auto-detect when running the dev server locally.
 * 3. Hard-coded production Render URL as final fallback.
 *
 * Defense-in-depth: if the resolved URL is a localhost address but the
 * browser hostname is a public domain, ignore it and use the production URL.
 * This guards against .env leaking into a production build when .env.production
 * is missing from the repository.
 */
const getSanitizedBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  const isLocalHostname =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('172.') ||
    hostname.endsWith('.local');

  // --- Local development: browser is on localhost/LAN ---
  if (isLocalHostname) {
    if (envUrl && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return envUrl.trim().replace(/\/+$/, '');
    }
    return `http://${hostname}:8000/api/v1`;
  }

  // --- Production / Vercel / any public hostname ---

  // If no env var is set, use the known production URL.
  if (!envUrl || envUrl.trim() === '') {
    return PRODUCTION_BACKEND;
  }

  const cleaned = envUrl.trim().replace(/\/+$/, '');

  // Guard: if the baked-in env var still points to localhost (e.g. .env was
  // accidentally used instead of .env.production), fall back to production URL.
  if (cleaned.includes('localhost') || cleaned.includes('127.0.0.1')) {
    console.warn(
      '[api] VITE_API_BASE_URL resolves to localhost on a public host — ' +
      'falling back to production backend. Set VITE_API_BASE_URL in .env.production.'
    );
    return PRODUCTION_BACKEND;
  }

  // Auto-correct legacy domain typo if present
  let result = cleaned.replace('-system.onrender.com', '.onrender.com');

  // Ensure path ends with /api/v1
  if (!result.includes('/api/v1')) {
    result += result.endsWith('/api') ? '/v1' : '/api/v1';
  }

  return result;
};

const API_BASE_URL = getSanitizedBaseUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // 60 s covers Render free-tier cold-starts (typically 30–50 s on first wake).
  // The Login page shows a retry prompt well before this fires.
  timeout: 60000,
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
