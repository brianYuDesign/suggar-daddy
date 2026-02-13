'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  Heart,
  MessageCircle,
  CreditCard,
  UserPlus,
  Star,
  CheckCheck,
} from 'lucide-react';
import { Button, Card, Skeleton, cn } from '@suggar-daddy/ui';
import { notificationsApi, ApiError } from '../../../lib/api';
import { timeAgo } from '../../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */
interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function getNotificationIcon(type: string) {
  switch (type) {
    case 'like':
      return Heart;
    case 'message':
      return MessageCircle;
    case 'payment':
    case 'tip':
    case 'subscription':
      return CreditCard;
    case 'match':
    case 'follow':
      return UserPlus;
    case 'review':
    case 'rating':
      return Star;
    default:
      return Bell;
  }
}

function getNotificationColor(type: string) {
  switch (type) {
    case 'like':
      return 'text-pink-500 bg-pink-50';
    case 'message':
      return 'text-brand-500 bg-brand-50';
    case 'payment':
    case 'tip':
      return 'text-green-500 bg-green-50';
    case 'subscription':
      return 'text-blue-500 bg-blue-50';
    case 'match':
    case 'follow':
      return 'text-purple-500 bg-purple-50';
    default:
      return 'text-gray-500 bg-gray-100';
  }
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await notificationsApi.getAll();
        if (!cancelled) {
          setNotifications(data as unknown as NotificationItem[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError ? err.message : '無法載入通知'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- actions ---------- */
  async function handleMarkAllAsRead() {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true }))
      );
    } catch {
      /* silent */
    } finally {
      setMarkingAll(false);
    }
  }

  async function handleMarkAsRead(id: string) {
    try {
      await notificationsApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      /* silent */
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-bold text-gray-900">通知</h1>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 rounded-xl bg-white p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">通知</h1>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-500">{unreadCount} 則未讀</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-brand-600 hover:text-brand-700"
            onClick={handleMarkAllAsRead}
            disabled={markingAll}
          >
            <CheckCheck className="h-4 w-4" />
            全部已讀
          </Button>
        )}
      </div>

      {/* List */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">沒有通知</h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            當有新的互動時，通知會出現在這裡
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const colorClasses = getNotificationColor(notification.type);
            const [iconColor, iconBg] = colorClasses.split(' ');

            return (
              <Card
                key={notification.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 p-4 transition-colors hover:bg-gray-50',
                  !notification.read && 'bg-brand-50/30'
                )}
                onClick={() => {
                  if (!notification.read) {
                    handleMarkAsRead(notification.id);
                  }
                }}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    iconBg
                  )}
                >
                  <Icon className={cn('h-5 w-5', iconColor)} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        'text-sm',
                        notification.read
                          ? 'font-normal text-gray-700'
                          : 'font-semibold text-gray-900'
                      )}
                    >
                      {notification.title}
                    </p>
                    {/* Unread dot */}
                    {!notification.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                  </div>
                  {notification.body && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {notification.body}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-400">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
