import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000
});

// Products API
export const productsAPI = {
  getAll: (filters = {}) => api.get('/products', { params: filters }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories/list')
};

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout')
};

// Orders API
export const ordersAPI = {
  create: (data) => api.post('/orders/create', data),
  getHistory: () => api.get('/orders/history'),
  getById: (id) => api.get(`/orders/${id}`)
};

// AI API
export const aiAPI = {
  getRecommendations: () => api.get('/ai/recommendations'),
  semanticSearch: (query) => api.post('/ai/semantic-search', { query }),
  generateDescription: (productId, tone) => api.post('/ai/generate-description', { productId, tone }),
  chat: (message, conversationId) => api.post('/ai/chat', { message, conversationId }),
  getDynamicPrice: (productId) => api.get(`/ai/dynamic-price/${productId}`),
  verifyTransaction: (data) => api.post('/ai/verify-transaction', data),
  getDemandForecast: (productId) => api.get(`/ai/demand-forecast/${productId}`),
  getAnalytics: () => api.get('/ai/analytics')
};
