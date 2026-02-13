'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, authApi, usersApi } from '../lib/api';
import { isTokenExpired } from '../lib/utils';
import { disconnectAll } from '../lib/socket';

/** Mirrors UserProfile from @suggar-daddy/dto (avoids decorator compilation issues) */
export interface UserProfile {
  id: string;
  role: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  birthDate?: Date;
  preferences?: Record<string, unknown>;
  verificationStatus: string;
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    role: 'sugar_baby' | 'sugar_daddy';
    displayName: string;
    bio?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'sd_access_token';
const REFRESH_KEY = 'sd_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTokens = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    apiClient.setToken(accessToken);
  }, []);

  const clearTokens = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    apiClient.clearToken();
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
  }, []);

  const scheduleRefresh = useCallback(
    (expiresIn: number) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      // Refresh 60 seconds before expiry
      const refreshMs = Math.max((expiresIn - 60) * 1000, 10_000);
      refreshTimerRef.current = setTimeout(async () => {
        const rt = localStorage.getItem(REFRESH_KEY);
        if (!rt) return;
        try {
          const res = await authApi.refresh({ refreshToken: rt } as any);
          setTokens(res.accessToken, res.refreshToken);
          scheduleRefresh(res.expiresIn);
        } catch {
          clearTokens();
          setState({ user: null, isLoading: false, isAuthenticated: false });
          router.push('/login');
        }
      }, refreshMs);
    },
    [setTokens, clearTokens, router]
  );

  const fetchUser = useCallback(async (): Promise<UserProfile | null> => {
    try {
      return await usersApi.getMe();
    } catch {
      return null;
    }
  }, []);

  // Initialise from stored tokens on mount
  useEffect(() => {
    const init = async () => {
      const accessToken = localStorage.getItem(TOKEN_KEY);
      const refreshToken = localStorage.getItem(REFRESH_KEY);

      if (!accessToken || !refreshToken) {
        setState({ user: null, isLoading: false, isAuthenticated: false });
        return;
      }

      // If access token is expired, try refresh
      if (isTokenExpired(accessToken)) {
        try {
          const res = await authApi.refresh({ refreshToken } as any);
          setTokens(res.accessToken, res.refreshToken);
          scheduleRefresh(res.expiresIn);
        } catch {
          clearTokens();
          setState({ user: null, isLoading: false, isAuthenticated: false });
          return;
        }
      } else {
        apiClient.setToken(accessToken);
        // Schedule refresh based on remaining time
        scheduleRefresh(300); // fallback: refresh in 5 min
      }

      const user = await fetchUser();
      setState({
        user,
        isLoading: false,
        isAuthenticated: !!user,
      });
    };

    init();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password } as any);
      setTokens(res.accessToken, res.refreshToken);
      scheduleRefresh(res.expiresIn);
      const user = await fetchUser();
      setState({ user, isLoading: false, isAuthenticated: !!user });
    },
    [setTokens, scheduleRefresh, fetchUser]
  );

  const register = useCallback(
    async (data: {
      email: string;
      password: string;
      role: 'sugar_baby' | 'sugar_daddy';
      displayName: string;
      bio?: string;
    }) => {
      const res = await authApi.register(data as any);
      setTokens(res.accessToken, res.refreshToken);
      scheduleRefresh(res.expiresIn);
      const user = await fetchUser();
      setState({ user, isLoading: false, isAuthenticated: !!user });
    },
    [setTokens, scheduleRefresh, fetchUser]
  );

  const logout = useCallback(() => {
    const rt = localStorage.getItem(REFRESH_KEY);
    authApi.logout(rt || undefined).catch(() => {});
    clearTokens();
    disconnectAll();
    setState({ user: null, isLoading: false, isAuthenticated: false });
    router.push('/');
  }, [clearTokens, router]);

  const refreshUser = useCallback(async () => {
    const user = await fetchUser();
    setState((prev) => ({ ...prev, user, isAuthenticated: !!user }));
  }, [fetchUser]);

  const value = useMemo(
    () => ({ ...state, login, register, logout, refreshUser }),
    [state, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
