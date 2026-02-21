'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { paymentsApi } from '../../lib/api';

/* ------------------------------------------------------------------ */
/*  DiamondBalance — compact widget for header / nav                   */
/* ------------------------------------------------------------------ */
export default function DiamondBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await paymentsApi.getDiamondBalance();
        if (!cancelled) {
          setBalance(data.balance ?? 0);
        }
      } catch {
        // Silently fail — widget should not block UI
        if (!cancelled) setBalance(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- loading shimmer ---------- */
  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5">
        <span className="text-sm">💎</span>
        <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  /* ---------- error / no data — still show link ---------- */
  if (balance === null) {
    return (
      <Link
        href="/diamonds"
        className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100"
      >
        <span>💎</span>
        <span>--</span>
      </Link>
    );
  }

  /* ---------- normal display ---------- */
  return (
    <Link
      href="/diamonds"
      className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100"
    >
      <span>💎</span>
      <span>{new Intl.NumberFormat('zh-TW').format(balance)}</span>
    </Link>
  );
}
