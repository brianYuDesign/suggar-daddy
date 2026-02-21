'use client';

import { useState } from 'react';
import { cn } from '@suggar-daddy/ui';
import { Undo2 } from 'lucide-react';
import { matchingApi, ApiError } from '../../../../lib/api';
import { DiamondPurchaseModal } from '../../../components/DiamondPurchaseModal';
import type { EnhancedUserCardDto } from '@suggar-daddy/dto';

interface UndoButtonProps {
  canUndo: boolean;
  onUndone: (card: EnhancedUserCardDto) => void;
}

export function UndoButton({ canUndo, onUndone }: UndoButtonProps) {
  const [loading, setLoading] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const handleUndo = async () => {
    if (!canUndo || loading) return;
    setLoading(true);
    try {
      const res = await matchingApi.undo();
      if (res.undone && res.card) {
        onUndone(res.card);
      }
    } catch (err) {
      if (err instanceof ApiError && err.message.includes('Insufficient')) {
        setShowPurchaseModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleUndo}
        disabled={!canUndo || loading}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-200 bg-white shadow-sm transition-all',
          'hover:scale-105 hover:border-amber-300 hover:shadow-md',
          'active:scale-95',
          'disabled:opacity-30 disabled:hover:scale-100'
        )}
        aria-label="回退"
      >
        <Undo2 className="h-4 w-4 text-amber-500" />
      </button>
      <DiamondPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        requiredAmount={10}
      />
    </>
  );
}
