'use client';

import { useState, useEffect, useCallback } from 'react';
import { matchingApi, paymentsApi } from '../../lib/api';
import { DiamondPurchaseModal } from './DiamondPurchaseModal';

export function BoostButton() {
  const [boosted, setBoosted] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [remaining, setRemaining] = useState('');
  const [loading, setLoading] = useState(false);
  const [cost, setCost] = useState<number>(150);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    paymentsApi.getDiamondConfig().then(cfg => {
      setCost(cfg.boostCost);
    }).catch(() => {});
  }, []);

  const updateCountdown = useCallback(() => {
    if (!expiresAt) return;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) {
      setBoosted(false);
      setExpiresAt(null);
      setRemaining('');
      return;
    }
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    setRemaining(`${mins}:${secs.toString().padStart(2, '0')}`);
  }, [expiresAt]);

  useEffect(() => {
    if (!expiresAt) return;
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, updateCountdown]);

  const handleBoost = async () => {
    setLoading(true);
    try {
      const result = await matchingApi.activateBoost();
      setBoosted(true);
      setExpiresAt(result.expiresAt);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Insufficient')) {
        setShowPurchaseModal(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (boosted) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-amber-700">
        <span className="text-lg">🚀</span>
        <span className="text-sm font-medium">Boosted</span>
        {remaining && <span className="text-xs text-amber-500">{remaining}</span>}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleBoost}
        disabled={loading}
        className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
      >
        <span className="text-lg">🚀</span>
        <span className="text-sm font-bold">Boost</span>
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
