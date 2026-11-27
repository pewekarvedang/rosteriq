import axios from 'axios';

export const getApiBaseUrl = (): string => {
  const customUrl = localStorage.getItem('rosteriq_backend_url');
  if (customUrl && customUrl.trim()) {
    let clean = customUrl.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/api/v1')) {
      clean = `${clean}/api/v1`;
    }
    return clean;
  }
  return import.meta.env.VITE_API_BASE_URL || '/api/v1';
};

export const setCustomBackendUrl = (url: string) => {
  if (!url || !url.trim()) {
    localStorage.removeItem('rosteriq_backend_url');
  } else {
    let clean = url.trim().replace(/\/+$/, '');
    if (clean.endsWith('/api/v1')) {
      clean = clean.replace(/\/api\/v1$/, '');
    }
    localStorage.setItem('rosteriq_backend_url', clean);
  }
};

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 60000, // 60s for OR-Tools optimization runs
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const activeRole = localStorage.getItem('rosteriq_user_role') || 'Operations Manager';
  config.headers['X-User-Role'] = activeRole;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'An unexpected error occurred';
    if (error.response) {
      if (error.response.data && error.response.data.detail) {
        if (typeof error.response.data.detail === 'string') {
          message = error.response.data.detail;
        } else if (Array.isArray(error.response.data.detail)) {
          message = error.response.data.detail
            .map((item: { msg?: string; loc?: string[] }) => item.msg || JSON.stringify(item))
            .join(', ');
        } else {
          message = JSON.stringify(error.response.data.detail);
        }
      } else {
        message = `Server error (${error.response.status}): ${error.response.statusText}`;
      }
    } else if (error.request) {
      const activeUrl = getApiBaseUrl();
      message = `Unable to connect to RosterIQ backend at ${activeUrl}. Please ensure the Render service is running.`;
    } else {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
