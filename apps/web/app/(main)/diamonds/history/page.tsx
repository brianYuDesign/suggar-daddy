'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Gem,
  ShoppingBag,
  Gift,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
} from 'lucide-react';
import {
  Card,
  Badge,
  Skeleton,
  Separator,
  cn,
} from '@suggar-daddy/ui';
import { paymentsApi, ApiError } from '../../../../lib/api';
import { timeAgo } from '../../../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */
interface DiamondTransaction {
  id: string;
  type: 'purchase' | 'spend' | 'credit' | 'transfer_in' | 'transfer_out' | 'conversion';
  amount: number;
  referenceId?: string;
  referenceType?: string;
  description: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const typeConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: typeof Gem; isIncome: boolean }
> = {
  purchase: {
    label: '購買',
    color: 'text-violet-700',
    bgColor: 'bg-violet-100',
    icon: ShoppingBag,
    isIncome: true,
  },
  spend: {
    label: '花費',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: ArrowUpRight,
    isIncome: false,
  },
  credit: {
    label: '獲得',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: Gift,
    isIncome: true,
  },
  transfer_in: {
    label: '轉入',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: ArrowDownLeft,
    isIncome: true,
  },
  transfer_out: {
    label: '轉出',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: ArrowUpRight,
    isIncome: false,
  },
  conversion: {
    label: '兌換',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    icon: ArrowRightLeft,
    isIncome: false,
  },
};

function getTypeConfig(type: string) {
  return (
    typeConfig[type] ?? {
      label: type,
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      icon: CreditCard,
      isIncome: true,
    }
  );
}

function formatNumber(n: number) {
  return new Intl.NumberFormat('zh-TW').format(Math.abs(n));
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function DiamondHistoryPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<DiamondTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---------- load ---------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await paymentsApi.getDiamondHistory(100);
        if (cancelled) return;
        setTransactions(
          Array.isArray(data) ? (data as unknown as DiamondTransaction[]) : [],
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '無法載入鑽石紀錄');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---------- render: loading ---------- */
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-28" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-16" />
          </Card>
        ))}
      </div>
    );
  }

  /* ---------- render: error ---------- */
  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/diamonds')}
          className="rounded-full p-1 transition-colors hover:bg-gray-100"
          aria-label="返回鑽石商店"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">鑽石交易紀錄</h1>
      </div>

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <Gem className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">沒有交易紀錄</h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            購買或使用鑽石後，紀錄會顯示在這裡
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {transactions.map((tx, idx) => {
            const config = getTypeConfig(tx.type);
            const Icon = config.icon;

            return (
              <div key={tx.id}>
                <Card className="flex items-center gap-3 p-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                      config.bgColor,
                    )}
                  >
                    <Icon className={cn('h-5 w-5', config.color)} />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          'text-[10px]',
                          config.bgColor,
                          config.color,
                        )}
                      >
                        {config.label}
                      </Badge>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-600">
                      {tx.description}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {timeAgo(tx.createdAt)}
                    </p>
                  </div>

                  {/* Amount */}
                  <p
                    className={cn(
                      'shrink-0 text-sm font-semibold',
                      config.isIncome ? 'text-green-600' : 'text-red-600',
                    )}
                  >
                    {config.isIncome ? '+' : '-'}
                    {formatNumber(tx.amount)} 💎
                  </p>
                </Card>

                {idx < transactions.length - 1 && (
                  <Separator className="my-1" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
