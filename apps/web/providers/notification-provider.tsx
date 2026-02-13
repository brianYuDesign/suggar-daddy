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
import { notificationsApi } from '../lib/api';

interface NotificationContextValue {
  unreadCount: number;
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  refresh: () => {},
});

const POLL_INTERVAL = 30_000; // 30 seconds

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const data = await notificationsApi.getAll();
      const items = data as unknown as { read: boolean }[];
      setUnreadCount(items.filter((n) => !n.read).length);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchCount();
    timerRef.current = setInterval(fetchCount, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchCount]);

  const value = useMemo(
    () => ({ unreadCount, refresh: fetchCount }),
    [unreadCount, fetchCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
