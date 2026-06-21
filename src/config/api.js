export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';
const APP_BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

export function appPath(path) {
  return `${APP_BASE}${path.startsWith('/') ? path : `/${path}`}` || '/';
}

function clearSession() {
  localStorage.removeItem('clinic_auth');
  localStorage.removeItem('clinic_token');
  localStorage.removeItem('clinic_refresh');
  localStorage.removeItem('clinic_user');
}

// Single in-flight refresh shared by concurrent 401s
let refreshPromise = null;

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = localStorage.getItem('clinic_refresh');
      if (!refreshToken) return false;
      try {
        const response = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) return false;
        const data = await response.json();
        localStorage.setItem('clinic_token', data.accessToken);
        // Backend rotates refresh tokens — store the new one
        if (data.refreshToken) {
          localStorage.setItem('clinic_refresh', data.refreshToken);
        }
        return true;
      } catch (_) {
        return false;
      } finally {
        // Allow the next refresh attempt after this one settles
        setTimeout(() => { refreshPromise = null; }, 0);
      }
    })();
  }
  return refreshPromise;
}

async function rawFetch(endpoint, options) {
  const token = localStorage.getItem('clinic_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Remove Content-Type if body is FormData (browser will set it with boundary)
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  return fetch(`${API_URL}${endpoint}`, { ...options, headers });
}

export async function fetchApi(endpoint, options = {}) {
  let response = await rawFetch(endpoint, options);

  // Access token expired? Try one silent refresh, then retry the request.
  if (response.status === 401 && !endpoint.startsWith('/auth/')) {
    const refreshed = await refreshSession();
    if (refreshed) {
      response = await rawFetch(endpoint, options);
    }
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
      window.location.href = appPath('/login');
    }
    if (response.status === 402 && data.code === 'subscription_inactive') {
      window.location.href = appPath('/subscription-inactive');
    }
    throw new Error(data.message || data.error || 'API request failed');
  }

  return data;
}

export async function fetchPublicApi(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || 'Request failed');
  return data;
}
