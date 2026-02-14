'use client';

import { useState } from 'react';
import { usersApi } from '../../../../../lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@suggar-daddy/ui';
import { Eye } from 'lucide-react';
import { Toggle } from './Toggle';

interface PrivacySectionProps {
  preferences?: Record<string, unknown>;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export function PrivacySection({ preferences, showToast }: PrivacySectionProps) {
  const [profilePublic, setProfilePublic] = useState(true);
  const [dmPermission, setDmPermission] = useState<'everyone' | 'followers' | 'nobody'>('everyone');
  const [privacySaving, setPrivacySaving] = useState(false);

  const handlePrivacyChange = async (
    field: 'profilePublic' | 'dmPermission',
    value: boolean | string
  ) => {
    setPrivacySaving(true);
    const prevPublic = profilePublic;
    const prevDm = dmPermission;

    if (field === 'profilePublic') setProfilePublic(value as boolean);
    else setDmPermission(value as 'everyone' | 'followers' | 'nobody');

    try {
      await usersApi.updateProfile({
        preferences: {
          ...(preferences ?? {}),
          profilePublic: field === 'profilePublic' ? value : profilePublic,
          dmPermission: field === 'dmPermission' ? value : dmPermission,
        },
      });
      showToast('隱私設定已更新', 'success');
    } catch {
      if (field === 'profilePublic') setProfilePublic(prevPublic);
      else setDmPermission(prevDm);
      showToast('隱私設定更新失敗', 'error');
    } finally {
      setPrivacySaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-gray-500" />
          <CardTitle className="text-base">隱私設定</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">公開檔案</p>
            <p className="text-xs text-gray-500">
              允許其他用戶查看你的個人檔案
            </p>
          </div>
          <Toggle
            checked={profilePublic}
            onChange={(v) => handlePrivacyChange('profilePublic', v)}
            disabled={privacySaving}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            誰可以私訊我
          </p>
          <div className="space-y-2">
            {(
              [
                { value: 'everyone', label: '所有人' },
                { value: 'followers', label: '僅追蹤者' },
                { value: 'nobody', label: '不接受私訊' },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="dmPermission"
                  value={option.value}
                  checked={dmPermission === option.value}
                  onChange={() =>
                    handlePrivacyChange('dmPermission', option.value)
                  }
                  disabled={privacySaving}
                  className="h-4 w-4 text-brand-500 focus:ring-brand-500"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
