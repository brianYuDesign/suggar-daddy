'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { paymentsApi } from '../lib/api';

const POLL_INTERVAL_MS = 30_000;

interface DiamondBalanceContextValue {
  balance: number | null;
  loading: boolean;
  refresh: () => void;
}

const DiamondBalanceContext = createContext<DiamondBalanceContextValue>({
  balance: null,
  loading: true,
  refresh: () => {},
});

export function DiamondBalanceProvider({ children }: { children: React.ReactNode }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchBalance = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const data = await paymentsApi.getDiamondBalance();
      setBalance(data.balance ?? 0);
    } catch {
      // Silently fail — keep last known value
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    fetchBalance();
    const timer = setInterval(fetchBalance, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchBalance]);

  // Refetch when tab regains focus
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchBalance();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [fetchBalance]);

  return (
    <DiamondBalanceContext.Provider value={{ balance, loading, refresh: fetchBalance }}>
      {children}
    </DiamondBalanceContext.Provider>
  );
}

export function useDiamondBalance() {
  return useContext(DiamondBalanceContext);
}
