'use client';

import { useState } from 'react';
import { usersApi } from '../../../../../lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@suggar-daddy/ui';
import { Bell } from 'lucide-react';
import { Toggle } from './Toggle';

interface NotificationSectionProps {
  preferences?: Record<string, unknown>;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export function NotificationSection({ preferences, showToast }: NotificationSectionProps) {
  const [pushNotification, setPushNotification] = useState(true);
  const [emailNotification, setEmailNotification] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  const handleNotifToggle = async (
    field: 'push' | 'email',
    value: boolean
  ) => {
    setNotifSaving(true);
    if (field === 'push') setPushNotification(value);
    else setEmailNotification(value);

    try {
      await usersApi.updateProfile({
        preferences: {
          ...(preferences ?? {}),
          pushNotification: field === 'push' ? value : pushNotification,
          emailNotification: field === 'email' ? value : emailNotification,
        },
      });
      showToast('通知設定已更新', 'success');
    } catch {
      if (field === 'push') setPushNotification(!value);
      else setEmailNotification(!value);
      showToast('通知設定更新失敗', 'error');
    } finally {
      setNotifSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-gray-500" />
          <CardTitle className="text-base">通知設定</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">推播通知</p>
            <p className="text-xs text-gray-500">接收新訊息、配對等即時通知</p>
          </div>
          <Toggle
            checked={pushNotification}
            onChange={(v) => handleNotifToggle('push', v)}
            disabled={notifSaving}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">郵件通知</p>
            <p className="text-xs text-gray-500">接收重要更新的電子郵件</p>
          </div>
          <Toggle
            checked={emailNotification}
            onChange={(v) => handleNotifToggle('email', v)}
            disabled={notifSaving}
          />
        </div>
      </CardContent>
    </Card>
  );
}
