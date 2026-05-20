/**
 * JWT token storage and axios interceptors.
 * - Token is stored in localStorage after sign-in.
 * - Request interceptor adds Authorization header to every /api request.
 * - Response interceptor catches 401s, clears auth, and redirects to sign-in.
 * - On tab focus (visibilitychange), if JWT is expired, redirect to sign-in immediately
 *   without attempting any API calls (avoids "Failed to load report").
 */
import axios from 'axios';
import { clearJobIdCache } from './jobIdCache';

const JWT_STORAGE_KEY = '__INVENTORY_JWT__';

function isSignInPage() {
  if (typeof window === 'undefined') return false;
  const p = window.location.pathname || '';
  return p.includes('/signIn') || p.includes('/auth/sign-in') || p.includes('/sign-in');
}

/** Parse JWT payload and check if exp is past. No verification. */
function isJwtExpired(token) {
  if (!token || typeof token !== 'string') return true;
  const raw = token.replace(/^Bearer\s+/i, '').trim();
  const parts = raw.split('.');
  if (parts.length < 2) return true;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    const exp = payload?.exp;
    if (exp == null) return false;
    const expSec = typeof exp === 'number' ? exp : parseInt(exp, 10);
    if (Number.isNaN(expSec)) return false;
    return expSec < Math.floor(Date.now() / 1000);
  } catch {
    return true;
  }
}

function clearAuthAndRedirect() {
  try {
    clearToken();
    clearJobIdCache();
    localStorage.removeItem('__INVENTORY_AUTH__');
    localStorage.removeItem('__INVENTORY_SESSION__');
  } catch {
    // ignore
  }
  if (!isSignInPage()) {
    try {
      sessionStorage.setItem('__INVENTORY_SESSION_EXPIRED__', '1');
    } catch {
      // ignore
    }
    const currentPath = window.location.pathname + window.location.search;
    const redirectUrl = new URL('/auth/sign-in', window.location.origin);
    redirectUrl.searchParams.set('redirectTo', currentPath);
    window.location.href = redirectUrl.toString();
  }
}

/** If user has a token and it is expired, clear auth and redirect to sign-in. */
function redirectToSignInIfSessionExpired() {
  if (typeof window === 'undefined' || isSignInPage()) return;
  const token = getToken();
  if (!token) return;
  if (!isJwtExpired(token)) return;
  clearAuthAndRedirect();
}

export function getToken() {
  try {
    return localStorage.getItem(JWT_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setToken(token) {
  if (!token || typeof token !== 'string') return;
  // Backend sends "Bearer <token>" - store only the token part
  const value = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
  if (!value) return;
  try {
    localStorage.setItem(JWT_STORAGE_KEY, value);
  } catch {
    // ignore (private mode / disabled storage)
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(JWT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Registers axios request interceptor to add JWT to /api calls.
 * Call this once at app startup (e.g. in main.jsx).
 */
export function setupAxiosAuth() {
  axios.interceptors.request.use((config) => {
    if (config.url?.startsWith('/api')) {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  });

  // On tab focus: if JWT expired, redirect immediately without loading
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') redirectToSignInIfSessionExpired();
    });
    redirectToSignInIfSessionExpired();
  }

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const url = error?.config?.url || '';
      const isApi = url?.startsWith('/api');
      const isSignIn = url?.includes('/signIn');

      if (status === 401 && isApi && !isSignIn && typeof window !== 'undefined') {
        clearAuthAndRedirect();
      }

      return Promise.reject(error);
    }
  );
}
