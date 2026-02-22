'use client';

import { useState, useEffect } from 'react';
import { paymentsApi } from '../../lib/api';
import type { DiamondBalance, DiamondConfig } from '@suggar-daddy/api-client';
import { useDiamondBalance } from '../../providers/diamond-balance-provider';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DiamondConvertModal({ isOpen, onClose, onSuccess }: Props) {
  const { refresh: refreshBalance } = useDiamondBalance();
  const [balance, setBalance] = useState<DiamondBalance | null>(null);
  const [config, setConfig] = useState<DiamondConfig | null>(null);
  const [amount, setAmount] = useState('');
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ cashAmount: number; remainingDiamonds: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    Promise.all([
      paymentsApi.getDiamondBalance(),
      paymentsApi.getDiamondConfig(),
    ]).then(([bal, cfg]) => {
      if (!cancelled) {
        setBalance(bal);
        setConfig(cfg);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen]);

  const diamondAmount = parseInt(amount, 10) || 0;
  const estimatedCash = config
    ? Math.round((diamondAmount / config.conversionRate) * (1 - config.platformFeeRate) * 100) / 100
    : 0;

  const handleConvert = async () => {
    if (!config || diamondAmount < config.minConversionDiamonds) {
      setError(`Minimum conversion is ${config?.minConversionDiamonds || 500} diamonds`);
      return;
    }
    if (balance && diamondAmount > balance.balance) {
      setError('Insufficient diamond balance');
      return;
    }
    setConverting(true);
    setError('');
    try {
      const res = await paymentsApi.convertDiamondsToCash(diamondAmount);
      setResult(res);
      refreshBalance();
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      setError(msg);
    } finally {
      setConverting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Convert Diamonds to Cash</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        {result ? (
          <div className="text-center">
            <div className="mb-2 text-4xl">🎉</div>
            <p className="mb-1 text-lg font-semibold text-green-600">
              ${result.cashAmount.toFixed(2)} credited to your wallet
            </p>
            <p className="mb-4 text-sm text-gray-500">
              Remaining: {result.remainingDiamonds.toLocaleString()} diamonds
            </p>
            <button
              onClick={onClose}
              className="rounded-lg bg-violet-600 px-6 py-2 text-white hover:bg-violet-700"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {balance && (
              <div className="mb-4 rounded-lg bg-violet-50 p-3 text-center">
                <span className="text-sm text-gray-500">Available: </span>
                <span className="font-bold text-violet-700">
                  💎 {balance.balance.toLocaleString()}
                </span>
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Diamonds to convert
              </label>
              <input
                type="number"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError(''); }}
                placeholder={`Min ${config?.minConversionDiamonds || 500}`}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-violet-500 focus:outline-none"
              />
            </div>

            {diamondAmount > 0 && config && (
              <div className="mb-4 rounded-lg bg-gray-50 p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Estimated cash:</span>
                  <span className="font-semibold text-green-600">${estimatedCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Platform fee ({(config.platformFeeRate * 100).toFixed(0)}%):</span>
                  <span>-${((diamondAmount / config.conversionRate) * config.platformFeeRate).toFixed(2)}</span>
                </div>
              </div>
            )}

            {error && (
              <p className="mb-4 text-sm text-red-500">{error}</p>
            )}

            <button
              onClick={handleConvert}
              disabled={converting || diamondAmount < (config?.minConversionDiamonds || 500)}
              className="w-full rounded-lg bg-violet-600 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {converting ? 'Converting...' : 'Convert to Cash'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
