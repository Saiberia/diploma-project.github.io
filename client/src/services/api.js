import axios from 'axios';

// Vite dev-server проксирует /api → http://localhost:5000 (vite.config.js).
// В проде используется тот же origin, поэтому относительный путь работает везде.
const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000
});

// Подкладываем токен из localStorage в каждый запрос
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const productsAPI = {
  getAll:        (filters = {}) => api.get('/products', { params: filters }),
  getById:       (id)           => api.get(`/products/${id}`),
  getCategories: ()             => api.get('/products/categories/list')
};

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login:    (data) => api.post('/auth/login', data),
  logout:   ()     => api.post('/auth/logout'),
  me:       ()     => api.get('/auth/me')
};

export const ordersAPI = {
  create:     (data) => api.post('/orders/create', data),
  getHistory: ()     => api.get('/orders/history'),
  getAll:     ()     => api.get('/orders/all'),
  getById:    (id)   => api.get(`/orders/${id}`),
  getQueue:   ()     => api.get('/orders/queue')
};

export const aiAPI = {
  // Поиск
  search:               (query, limit = 20, userId) =>
    api.post('/ai/search', { query, limit, userId }),

  // Рекомендации
  getPersonalized:      (viewedIds, purchasedIds, options = {}) =>
    api.post('/ai/recommendations/personalized', { viewedIds, purchasedIds, ...options }),
  getSimilar:           (productId, options = {}) =>
    api.get(`/ai/recommendations/similar/${productId}`, { params: options }),
  getPopular:           (limit = 4) =>
    api.get('/ai/recommendations/popular', { params: { limit } }),

  // Чат
  chat:                 (data) => api.post('/ai/chat', data),

  // Поведение
  track:                (userId, action, data) =>
    api.post('/ai/track', { userId, action, data }),

  // Бизнес-AI
  getDynamicPrice:      (productId, params = {}) =>
    api.get(`/ai/dynamic-price/${productId}`, { params }),
  calculatePrice:       (data) => api.post('/ai/calculate-price', data),
  getPricingContext:    (productId) => api.get(`/ai/pricing-context/${productId}`),
  getDemandForecast:    (productId, days = 14) =>
    api.get(`/ai/demand-forecast/${productId}`, { params: { days } }),
  getHolidayCalendar:   (days = 30) => api.get('/ai/holidays', { params: { days } }),
  verifyTransaction:    (data) => api.post('/ai/verify-transaction', data),
  getFraudLog:          (limit = 50) => api.get('/ai/fraud-log', { params: { limit } }),

  // Inventory + Queue
  getInventoryAlerts:   ()    => api.get('/ai/inventory/alerts'),
  getInventoryForecast: (id)  => api.get(`/ai/inventory/forecast/${id}`),

  // Аналитика
  getAnalytics:         () => api.get('/ai/analytics'),
  getSearchAnalytics:   () => api.get('/ai/analytics/search'),
  getChatAnalytics:     () => api.get('/ai/analytics/chat'),
  getUsers:             (limit = 50) => api.get('/ai/users', { params: { limit } }),
  getUser:              (userId) => api.get(`/ai/users/${userId}`),

  // Метрики качества
  getMetrics:           (params = {}) => api.get('/ai/metrics', { params }),
  getAlphaSweep:        (params = {}) => api.get('/ai/metrics/alpha-sweep', { params }),
  getHealth:            () => api.get('/ai/health')
};
