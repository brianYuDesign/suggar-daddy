'use client';

import { useState } from 'react';
import { usersApi } from '../../../../../lib/api';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@suggar-daddy/ui';
import { DollarSign, Loader2 } from 'lucide-react';

interface CreatorSectionProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

export function CreatorSection({ showToast }: CreatorSectionProps) {
  const [dmPrice, setDmPrice] = useState<string>('');
  const [dmPriceSaving, setDmPriceSaving] = useState(false);

  const handleDmPriceSave = async () => {
    setDmPriceSaving(true);
    try {
      const priceInCents = Math.round(parseFloat(dmPrice || '0') * 100);
      await usersApi.setDmPrice(priceInCents);
      showToast('DM 價格已更新', 'success');
    } catch {
      showToast('DM 價格更新失敗', 'error');
    } finally {
      setDmPriceSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-gray-500" />
          <CardTitle className="text-base">Creator 設定</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="dmPrice">DM 價格 (USD)</Label>
          <p className="text-xs text-gray-500">
            設定粉絲向你發送私訊的費用，設為 0 即為免費
          </p>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                $
              </span>
              <Input
                id="dmPrice"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={dmPrice}
                onChange={(e) => setDmPrice(e.target.value)}
                className="pl-7"
              />
            </div>
            <Button
              type="button"
              onClick={handleDmPriceSave}
              disabled={dmPriceSaving}
            >
              {dmPriceSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                '儲存'
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
