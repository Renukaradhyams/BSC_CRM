import axios, { InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '', // Dev server proxy redirects requests to backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach bearer token to request authorization header
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('crm_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Catch 401/403 and flush invalid token sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401 || status === 403) {
        const path = window.location.pathname;
        if (path !== '/' && path !== '/login' && path !== '/onboard') {
          localStorage.removeItem('crm_token');
          localStorage.removeItem('crm_user');
          localStorage.removeItem('crm_settings');
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
