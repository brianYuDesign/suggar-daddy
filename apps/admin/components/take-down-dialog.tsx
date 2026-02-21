'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Label, Button } from '@suggar-daddy/ui';

interface TakeDownDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function TakeDownDialog({ open, onClose, onConfirm, loading }: TakeDownDialogProps) {
  const [reason, setReason] = useState('');
  const { t } = useTranslation('common');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{t('takeDown.title')}</DialogTitle>
        <DialogDescription>
          {t('takeDown.description')}
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <Label htmlFor="reason">{t('takeDown.reason')}</Label>
        <textarea
          id="reason"
          className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t('takeDown.placeholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {t('actions.cancel')}
        </Button>
        <Button
          variant="default"
          onClick={handleConfirm}
          disabled={loading || !reason.trim()}
        >
          {loading ? t('takeDown.processing') : t('takeDown.confirmButton')}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
