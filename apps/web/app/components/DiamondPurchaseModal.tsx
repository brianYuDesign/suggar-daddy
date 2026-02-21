'use client';

import { useState, useEffect } from 'react';
import { paymentsApi } from '../../lib/api';
import type { DiamondPackage } from '@suggar-daddy/api-client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  requiredAmount?: number;
}

export function DiamondPurchaseModal({ isOpen, onClose, requiredAmount }: Props) {
  const [packages, setPackages] = useState<DiamondPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    paymentsApi.getDiamondPackages().then(pkgs => {
      if (!cancelled) {
        setPackages(pkgs);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [isOpen]);

  const handlePurchase = async (packageId: string) => {
    setPurchasing(packageId);
    try {
      const result = await paymentsApi.purchaseDiamonds(packageId);
      if (result.sessionUrl) {
        window.location.href = result.sessionUrl;
      }
    } catch {
      setPurchasing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {requiredAmount ? `Need ${requiredAmount} more diamonds` : 'Get Diamonds'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        {requiredAmount && (
          <p className="mb-4 text-sm text-gray-500">
            You need at least {requiredAmount} more diamonds. Choose a package below:
          </p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {packages.map(pkg => {
              const total = pkg.diamondAmount + pkg.bonusDiamonds;
              const meetsRequirement = !requiredAmount || total >= requiredAmount;
              return (
                <button
                  key={pkg.id}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={purchasing !== null}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 transition-all ${
                    meetsRequirement
                      ? 'border-violet-200 bg-violet-50 hover:border-violet-400'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  } ${purchasing === pkg.id ? 'opacity-70' : ''}`}
                >
                  <div className="text-left">
                    <div className="font-semibold text-gray-900">{pkg.name}</div>
                    <div className="text-sm text-gray-500">
                      {pkg.diamondAmount.toLocaleString()} diamonds
                      {pkg.bonusDiamonds > 0 && (
                        <span className="ml-1 text-violet-600">+{pkg.bonusDiamonds.toLocaleString()} bonus</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-violet-700">${pkg.priceUsd.toFixed(2)}</div>
                    {purchasing === pkg.id && (
                      <div className="text-xs text-gray-400">Processing...</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
