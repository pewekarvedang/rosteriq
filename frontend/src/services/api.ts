import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s for OR-Tools optimization runs
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
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
      message = 'Unable to connect to RosterIQ backend. Please ensure the server is running on port 8000.';
    } else {
      message = error.message;
    }
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
