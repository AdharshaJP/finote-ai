import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  verify: () => api.get('/auth/verify'),
};

export const transactionsAPI = {
  getAll: (params) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  getStats: () => api.get('/transactions/stats'),
};

export const budgetsAPI = {
  getAll: () => api.get('/budgets'),
  create: (data) => api.post('/budgets', data),
  update: (id, data) => api.put(`/budgets/${id}`, data),
  delete: (id) => api.delete(`/budgets/${id}`),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getChartData: () => api.get('/dashboard/charts'),
};

export const aiAPI = {
  insights: (userId) => api.get(`/ai/insights/${userId}`),
  predict: (userId) => api.get(`/ai/predict/${userId}`),
  chat: (question, userId) => api.post('/ai/chat', { question, userId }),
  afford: (userId, item, amount) => api.post('/ai/afford', { userId, item, amount }),
  anomaly: (userId) => api.get(`/ai/anomaly/${userId}`),
  uploadBill: (formData) =>
    api.post('/ai/upload-bill', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  confirmBill: (data) => api.post('/ai/confirm-bill', data),
};

export const billsAPI = {
  getAll:  (params) => api.get('/bills', { params }),
  scan:    (formData) => api.post('/bills/scan', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  create:  (data) => api.post('/bills', data),
  update:  (id, data) => api.put(`/bills/${id}`, data),
  delete:  (id) => api.delete(`/bills/${id}`),
};

export const reviewsAPI = {
  getAll: () => api.get('/reviews'),
  getMine: () => api.get('/reviews/mine'),
  submit: (data) => api.post('/reviews', data),
};

export const publicAPI = {
  stats: () => api.get('/public/stats'),
};