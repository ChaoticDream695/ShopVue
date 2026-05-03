import { defineStore } from 'pinia';
import api from '@/utils/api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null
  }),

  getters: {
    isAuthenticated: (s) => !!s.token,
    isAdmin: (s) => s.user?.role === 'admin',
    isCustomer: (s) => s.user?.role === 'customer'
  },

  actions: {
    async login(credentials) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post('/auth/login', credentials);
        this.token = data.token;
        this.user = data.user;
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        return data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Login failed';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async register(payload) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post('/auth/register', payload);
        return data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Registration failed';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
});
