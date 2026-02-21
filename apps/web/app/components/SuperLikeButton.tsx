'use client';

import { useState, useEffect } from 'react';
import { matchingApi, paymentsApi } from '../../lib/api';
import { DiamondPurchaseModal } from './DiamondPurchaseModal';

interface Props {
  targetUserId: string;
  onResult?: (matched: boolean, matchId?: string) => void;
}

export function SuperLikeButton({ targetUserId, onResult }: Props) {
  const [loading, setLoading] = useState(false);
  const [cost, setCost] = useState<number>(50);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    paymentsApi.getDiamondConfig().then(cfg => {
      setCost(cfg.superLikeCost);
    }).catch(() => {});
  }, []);

  const handleSuperLike = async () => {
    setLoading(true);
    try {
      const result = await matchingApi.superLike(targetUserId);
      onResult?.(result.matched, result.matchId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Insufficient')) {
        setShowPurchaseModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleSuperLike}
        disabled={loading}
        className="flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
      >
        <span className="text-lg">⭐</span>
        <span className="text-sm font-bold">Super Like</span>
        <span className="text-xs opacity-80">💎{cost}</span>
      </button>
      <DiamondPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        requiredAmount={cost}
      />
    </>
  );
}
