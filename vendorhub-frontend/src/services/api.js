import axios from 'axios';

/** Full REST base, e.g. http://localhost:5000/api — override with REACT_APP_API_BASE_URL in .env */
export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api').replace(
  /\/$/,
  ''
);

/** Web host for SignalR (same machine as API, without /api). Override with REACT_APP_SIGNALR_ORIGIN if needed. */
export function getSignalRNotificationsUrl() {
  const origin = (process.env.REACT_APP_SIGNALR_ORIGIN || API_BASE_URL.replace(/\/api$/i, '')).replace(
    /\/$/,
    ''
  );
  return `${origin}/hubs/notifications`;
}

const api = axios.create({ baseURL: API_BASE_URL });

/** Normalize login/register responses whether the payload is flat or nested under `data` / `user`. */
export function parseAuthResponse(res) {
  const body = res?.data;
  const p = body?.data !== undefined ? body.data : body;
  if (!p || typeof p !== 'object') return null;

  const token = p.token ?? p.Token ?? p.accessToken ?? p.AccessToken ?? p.access_token;
  if (!token) return null;

  const nestedUser = p.user ?? p.User;
  if (nestedUser && typeof nestedUser === 'object') {
    return { token, userData: { ...nestedUser } };
  }

  const { token: _t, Token: _T, accessToken: _a, AccessToken: _A, access_token: _b, user: _u, User: _U, ...userData } = p;
  return { token, userData };
}

/** Readable message for axios errors (ASP.NET ProblemDetails, validation `errors`, network). */
export function getApiErrorMessage(err) {
  const d = err?.response?.data;
  if (!d) {
    if (err?.message?.includes('Network Error')) {
      return `Cannot reach the API at ${API_BASE_URL}. Start the backend on that host/port, or create a .env file with REACT_APP_API_BASE_URL=... and restart npm start.`;
    }
    return err?.message || 'Request failed';
  }
  if (typeof d.message === 'string') return d.message;
  if (typeof d.title === 'string' && d.title !== 'One or more validation errors occurred.') return d.title;
  if (d.errors && typeof d.errors === 'object') {
    const first = Object.values(d.errors).flat()[0];
    if (typeof first === 'string') return first;
  }
  if (typeof d.title === 'string') return d.title;
  return 'Request failed';
}

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
};

// ─── Products ─────────────────────────────────────────────────────────────────
export const productAPI = {
  browse: (params) => api.get('/products', { params }),
  getById: (id, config) => api.get(`/products/${id}`, config),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.delete(`/products/${id}`),
  myProducts: () => api.get('/products/my'),
  stats: () => api.get('/products/stats'),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminAPI = {
  getVendors: () => api.get('/admin/vendors'),
  getPendingVendors: () => api.get('/admin/vendors/pending'),
  reviewVendor: (id, status) => api.put(`/admin/vendors/${id}/review?status=${status}`),
  updatePermissions: (id, data) => api.put(`/admin/vendors/${id}/permissions`, data),
  getPendingProducts: () => api.get('/admin/products/pending'),
  reviewProduct: (id, status) => api.put(`/admin/products/${id}/review?status=${status}`),
};

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orderAPI = {
  place: (data) => api.post('/orders', data),
  myOrders: () => api.get('/orders/my'),
  vendorOrders: () => api.get('/orders/vendor'),
};

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviewAPI = {
  getByProduct: (productId) => api.get(`/reviews/${productId}`),
  add: (data) => api.post('/reviews', data),
};

// ─── Favorites ────────────────────────────────────────────────────────────────
export const favoriteAPI = {
  getAll: () => api.get('/favorites'),
  toggle: (productId) => api.post(`/favorites/${productId}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifAPI = {
  getAll: () => api.get('/notifications'),
  markAllRead: () => api.put('/notifications/read-all'),
};

export default api;
