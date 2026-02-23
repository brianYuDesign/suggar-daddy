'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { notificationsApi } from '../lib/api';
import { getNotificationSocket } from '../lib/socket';
import { useAuth } from './auth-provider';

interface NotificationContextValue {
  unreadCount: number;
  /** 手動重新整理未讀數量 */
  refresh: () => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  unreadCount: 0,
  refresh: () => {},
});

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  /** 從 REST API 取得未讀數量 */
  const fetchCount = useCallback(async () => {
    try {
      const result = await notificationsApi.getUnreadCount();
      setUnreadCount((result as { count: number }).count);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // 初始載入
    fetchCount();

    // 建立 WebSocket 連線
    const socket = getNotificationSocket();

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join', { userId: user.id });

    // 收到新通知時 +1
    function handleNotification() {
      setUnreadCount((prev) => prev + 1);
    }

    // 標記已讀後更新
    function handleMarkedRead() {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    function handleAllMarkedRead() {
      setUnreadCount(0);
    }

    // Reconnect 時重新同步未讀數
    function handleConnect() {
      if (user?.id) {
        socket.emit('join', { userId: user.id });
      }
      fetchCount();
    }

    socket.on('notification', handleNotification);
    socket.on('marked_read', handleMarkedRead);
    socket.on('all_marked_read', handleAllMarkedRead);
    socket.on('connect', handleConnect);

    return () => {
      socket.off('notification', handleNotification);
      socket.off('marked_read', handleMarkedRead);
      socket.off('all_marked_read', handleAllMarkedRead);
      socket.off('connect', handleConnect);
    };
  }, [user?.id, fetchCount]);

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
