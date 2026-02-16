'use client';

import { useState } from 'react';
import { paymentsApi, ApiError } from '../../lib/api';
import { useToast } from '../../providers/toast-provider';
import { Button, Card, CardContent } from '@suggar-daddy/ui';
import { DollarSign, Loader2, X } from 'lucide-react';

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

interface TipModalProps {
  recipientId: string;
  recipientName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function TipModal({
  recipientId,
  recipientName,
  onClose,
  onSuccess,
}: TipModalProps) {
  const toast = useToast();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isTipping, setIsTipping] = useState(false);

  const finalAmount = customAmount ? Number(customAmount) : selectedAmount;

  const handleSelectPreset = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmount('');
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleConfirm = async () => {
    if (!finalAmount || finalAmount <= 0) return;
    setIsTipping(true);
    try {
      await paymentsApi.sendTip(recipientId, finalAmount);
      toast.success(`已成功打賞 $${finalAmount}${recipientName ? ` 給 ${recipientName}` : ''}`);
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(ApiError.getMessage(err, '打賞失敗，請稍後再試'));
    } finally {
      setIsTipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-brand-500" />
              打賞{recipientName ? ` ${recipientName}` : '創作者'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              disabled={isTipping}
              className="rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="關閉"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Preset amounts */}
          <div className="grid grid-cols-5 gap-2">
            {PRESET_AMOUNTS.map((amt) => (
              <Button
                key={amt}
                variant={selectedAmount === amt ? 'default' : 'outline'}
                size="sm"
                className={
                  selectedAmount === amt
                    ? 'bg-brand-500 text-white hover:bg-brand-600'
                    : ''
                }
                onClick={() => handleSelectPreset(amt)}
              >
                ${amt}
              </Button>
            ))}
          </div>

          {/* Custom amount input */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              $
            </span>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="自訂金額"
              min="1"
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white pl-7 pr-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isTipping}
            >
              取消
            </Button>
            <Button
              className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
              disabled={isTipping || !finalAmount || finalAmount <= 0}
              onClick={handleConfirm}
            >
              {isTipping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  處理中...
                </>
              ) : (
                `確認打賞${finalAmount ? ` $${finalAmount}` : ''}`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
