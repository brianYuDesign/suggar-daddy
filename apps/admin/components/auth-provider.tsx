'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { getToken, clearToken, getRefreshToken, isAuthenticated, getTokenTTL } from '@/lib/auth';
import { authApi } from '@/lib/api';

interface AuthContextType {
  token: string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Warn 5 minutes before token expiry
const WARNING_THRESHOLD = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [token, setTokenState] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const { t } = useTranslation('common');

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken();
    authApi.logout(refreshToken || undefined).catch(() => {});
    clearToken();
    setTokenState(null);
    router.replace('/login');
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
    } else {
      setTokenState(getToken());
    }
    setChecked(true);
  }, [router]);

  // Session timeout watcher
  useEffect(() => {
    if (!token) return;

    const checkExpiry = () => {
      const ttl = getTokenTTL();
      if (ttl === 0) {
        logout();
        return;
      }
      if (ttl < WARNING_THRESHOLD) {
        setShowWarning(true);
      }
    };

    // Check every 30 seconds
    const interval = setInterval(checkExpiry, 30_000);
    checkExpiry(); // Initial check

    return () => clearInterval(interval);
  }, [token, logout]);

  // Activity listener — reset warning on user interaction
  useEffect(() => {
    if (!showWarning) return;
    const handleActivity = () => {
      const ttl = getTokenTTL();
      if (ttl > WARNING_THRESHOLD) {
        setShowWarning(false);
      }
    };
    window.addEventListener('click', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [showWarning]);

  if (!checked || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, logout }}>
      {children}
      {showWarning && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-yellow-500 bg-yellow-50 p-4 shadow-lg dark:bg-yellow-900/20">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            {t('session.expiringSoon')}
          </p>
          <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-300">
            {t('session.saveWork')}
          </p>
          <button
            onClick={logout}
            className="mt-2 rounded-md bg-yellow-600 px-3 py-1 text-xs text-white hover:bg-yellow-700"
          >
            {t('session.logoutNow')}
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}
