// src/stores/auth.ts
import { defineStore } from 'pinia';
import { decodeJwtPayload, canAccessDashboard as checkDashboard } from '../utils/jwt';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null as string | null,
    isLoggedIn: false,
    role: null as string | null,
  }),
  actions: {
    login(token: string, role?: string) {
      this.token = token;
      this.isLoggedIn = true;
      this.role = role ?? decodeJwtPayload(token)?.role ?? null;
      localStorage.setItem('token', token);
    },
    logout() {
      this.token = null;
      this.isLoggedIn = false;
      this.role = null;
      localStorage.removeItem('token');
      window.location.href = '/login';
    },
    initialize() {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        this.token = savedToken;
        this.isLoggedIn = true;
        this.role = decodeJwtPayload(savedToken)?.role ?? null;
      }
    },
  },
  getters: {
    authHeader: (state) => {
      return state.token ? { Authorization: `Bearer ${state.token}` } : {};
    },
    canAccessDashboard: (state) => checkDashboard(state.role ?? undefined),
  },
});