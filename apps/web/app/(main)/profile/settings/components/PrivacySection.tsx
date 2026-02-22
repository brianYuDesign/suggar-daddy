'use client';

import { useState } from 'react';
import { usersApi } from '../../../../../lib/api';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@suggar-daddy/ui';
import { Eye, Diamond } from 'lucide-react';
import { Toggle } from './Toggle';

interface PrivacySectionProps {
  preferences?: Record<string, unknown>;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export function PrivacySection({ preferences, showToast }: PrivacySectionProps) {
  const [profilePublic, setProfilePublic] = useState(true);
  const [dmPermission, setDmPermission] = useState<'everyone' | 'followers' | 'nobody'>('everyone');
  const [privacySaving, setPrivacySaving] = useState(false);
  const [chatDiamondGateEnabled, setChatDiamondGateEnabled] = useState(false);
  const [chatDiamondThreshold, setChatDiamondThreshold] = useState(5);
  const [chatDiamondCost, setChatDiamondCost] = useState(10);

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
                  className="h-4 w-4 text-neutral-900 focus:ring-neutral-900"
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
        {/* Diamond Chat Gate */}
        <div className="border-t pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Diamond className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-medium text-gray-700">鑽石聊天門檻</p>
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-700">啟用鑽石聊天門檻</p>
              <p className="text-xs text-gray-500">
                對方達到免費訊息上限後需花鑽石才能繼續聊天
              </p>
            </div>
            <Toggle
              checked={chatDiamondGateEnabled}
              onChange={async (v) => {
                setChatDiamondGateEnabled(v);
                try {
                  await usersApi.updateProfile({ chatDiamondGateEnabled: v });
                  showToast('鑽石聊天門檻設定已更新', 'success');
                } catch {
                  setChatDiamondGateEnabled(!v);
                  showToast('設定更新失敗', 'error');
                }
              }}
              disabled={privacySaving}
            />
          </div>
          {chatDiamondGateEnabled && (
            <div className="space-y-3 pl-1">
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">
                  免費訊息數量
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={chatDiamondThreshold}
                  onChange={(e) => setChatDiamondThreshold(Number(e.target.value))}
                  onBlur={async () => {
                    try {
                      await usersApi.updateProfile({ chatDiamondThreshold });
                      showToast('已更新', 'success');
                    } catch {
                      showToast('更新失敗', 'error');
                    }
                  }}
                  className="h-9 w-24"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">
                  解鎖鑽石費用
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={chatDiamondCost}
                  onChange={(e) => setChatDiamondCost(Number(e.target.value))}
                  onBlur={async () => {
                    try {
                      await usersApi.updateProfile({ chatDiamondCost });
                      showToast('已更新', 'success');
                    } catch {
                      showToast('更新失敗', 'error');
                    }
                  }}
                  className="h-9 w-24"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
