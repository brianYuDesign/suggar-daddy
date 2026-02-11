'use client';

import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Label, Button } from '@suggar-daddy/ui';

interface TakeDownDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function TakeDownDialog({ open, onClose, onConfirm, loading }: TakeDownDialogProps) {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Take Down Post</DialogTitle>
        <DialogDescription>
          This action will hide the post from all users. Please provide a reason.
        </DialogDescription>
      </DialogHeader>
      <div className="py-4">
        <Label htmlFor="reason">Reason</Label>
        <textarea
          id="reason"
          className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Enter the reason for taking down this post..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="default"
          onClick={handleConfirm}
          disabled={loading || !reason.trim()}
        >
          {loading ? 'Processing...' : 'Confirm Take Down'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
