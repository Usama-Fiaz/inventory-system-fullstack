import { deleteCookie, getCookie } from 'cookies-next';
import { clearToken } from '@/lib/jwt';
import { clearJobIdCache } from '@/lib/jobIdCache';
import { createContext, useContext, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
const AuthContext = createContext(undefined);
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
const authSessionKey = '_Rasket_AUTH_KEY_';
const AUTH_STORAGE_KEY = '__INVENTORY_AUTH__';
export function AuthProvider({
  children
}) {
  const navigate = useNavigate();
  const getSession = () => {
    // Prefer localStorage to avoid huge Cookie headers (can cause Vite 431).
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }

    // Backward-compat fallback: read the old cookie (if present and parseable).
    const fetchedCookie = getCookie(authSessionKey)?.toString();
    if (!fetchedCookie) return undefined;
    try {
      return JSON.parse(fetchedCookie);
    } catch {
      return undefined;
    }
  };
  const [user, setUser] = useState(getSession());
  const saveSession = user => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user ?? null));
    } catch {
      // ignore (private mode / disabled storage)
    }

    // Update react state after persisting (avoids a short redirect race on sign-in)
    setUser(user);

    // Cleanup: remove old cookie to prevent oversized Cookie headers.
    try {
      deleteCookie(authSessionKey, { path: '/' });
      deleteCookie(authSessionKey, { path: '/' });
    } catch {
      // ignore
    }
  };
  const removeSession = () => {
    clearToken();
    clearJobIdCache();
    try {
      deleteCookie(authSessionKey, { path: '/' });
      deleteCookie(authSessionKey, { path: '/' });
    } catch {
      // ignore
    }
    setUser(undefined);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('__INVENTORY_SESSION__');
    } catch {
      // ignore
    }
    navigate('/auth/sign-in');
  };

  const isAuthenticated = useMemo(() => {
    if (user) return true;
    try {
      // Fallback to localStorage so route guard doesn't race right after saveSession().
      return !!localStorage.getItem(AUTH_STORAGE_KEY);
    } catch {
      return false;
    }
  }, [user]);
  return <AuthContext.Provider value={{
    user,
    isAuthenticated,
    saveSession,
    removeSession
  }}>
      {children}
    </AuthContext.Provider>;
}