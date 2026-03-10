// src/services/api.ts
import { useAuthStore } from '../stores/auth';

// Shared API base URL used by all HTTP and SSE calls.
// Prefer environment override; default to same-origin /api so it works
// for both main and preview domains behind the reverse proxy.
export const API_BASE =
    import.meta.env.VITE_API_BASE ?? '/api';

export async function api<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const authStore = useAuthStore();

    const headers = new Headers();
// If body is FormData, let the browser set Content-Type (multipart boundary)
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    if (!isFormData) {
        headers.set('Content-Type', 'application/json');
    }

    if (authStore.token) {
        headers.set('Authorization', `Bearer ${authStore.token}`);
    }

    if (options.headers) {
        if (options.headers instanceof Headers) {
            options.headers.forEach((value, key) => headers.set(key, value));
        } else {
            Object.entries(options.headers as Record<string, string>).forEach(([k, v]) => headers.set(k, v));
        }
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorText = '';
        try {
            errorText = await response.text();
        } catch {
            errorText = `HTTP ${response.status} ${response.statusText}`;
        }
        throw new Error(errorText || 'API request failed');
    }

    // Handle empty responses (204)
    if (response.status === 204 || response.headers.get('Content-Length') === '0') {
        return {} as T;
    }

    const text = await response.text();
    if (!text) return {} as T;

    try {
        return JSON.parse(text) as T;
    } catch {
        throw new Error('Invalid JSON response from server');
    }
}