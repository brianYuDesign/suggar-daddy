// lib/theme/theme-provider.tsx
// 深色模式主題提供者

'use client';

import React, { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = React.createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
  isDark: false,
});

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
}) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [isDark, setIsDark] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 初始化主題
  useEffect(() => {
    setIsClient(true);

    // 從 localStorage 讀取主題
    const storedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
      setThemeState(storedTheme);
    }

    // 檢測系統主題偏好
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateDarkMode = (isDark: boolean) => setIsDark(isDark);

    updateDarkMode(
      storedTheme === 'dark' ||
        (storedTheme !== 'light' && mediaQuery.matches)
    );

    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        updateDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [storageKey, theme]);

  // 應用主題
  useEffect(() => {
    if (!isClient) return;

    const root = document.documentElement;
    const resolvedTheme =
      theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;

    setIsDark(resolvedTheme === 'dark');

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme, isClient]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(storageKey, newTheme);
  };

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
