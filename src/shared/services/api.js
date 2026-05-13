const API_BASE = 'http://localhost:3000/api';

async function apiFetch(url, options = {}) {
  const response = await fetch(url, { ...options, credentials: 'include' });
  if (response.status === 401) {
    const err = new Error('UNAUTHORIZED');
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  return response;
}

export const api = {
  auth: {
    async login(username, password) {
      const res = await fetch(`${API_BASE}/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
        throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
      return data;
    },

    async logout() {
      await apiFetch(`${API_BASE}/user/logout`, { method: 'POST' });
    },
  },

  product: {
    async getAll(params = {}) {
      const queryString = new URLSearchParams(params).toString();
      const url = `${API_BASE}/products${queryString ? `?${queryString}` : ''}`;
      const response = await apiFetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch products'}`);
      }
      return response.json();
    },

    async getById(id) {
      const response = await apiFetch(`${API_BASE}/products/${id}`);
      if (!response.ok) throw new Error('Failed to fetch product');
      return response.json();
    },

    async create(data) {
      const response = await apiFetch(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Lỗi tạo sản phẩm');
      }
      return response.json();
    },

    async getBrands() {
      const response = await apiFetch(`${API_BASE}/products/brands`);
      if (!response.ok) throw new Error('Failed to fetch brands');
      return response.json();
    },

    async getCategories() {
      const response = await apiFetch(`${API_BASE}/products/categories`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
  },
};
