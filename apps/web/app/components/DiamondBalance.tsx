'use client';

import Link from 'next/link';
import { useDiamondBalance } from '../../providers/diamond-balance-provider';

export default function DiamondBalance() {
  const { balance, loading } = useDiamondBalance();

  if (loading) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5">
        <span className="text-sm">💎</span>
        <div className="h-4 w-10 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

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
