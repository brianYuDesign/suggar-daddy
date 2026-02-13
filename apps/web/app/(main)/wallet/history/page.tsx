'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Gift,
  Loader2,
} from 'lucide-react';
import {
  Button,
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
interface Transaction {
  id: string;
  userId: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const typeConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: typeof Gift }
> = {
  tip: {
    label: '打賞',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: Gift,
  },
  subscription: {
    label: '訂閱',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: CreditCard,
  },
  purchase: {
    label: '購買',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: ArrowUpRight,
  },
  withdrawal: {
    label: '提款',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: ArrowDownLeft,
  },
};

function getTypeConfig(type: string) {
  return (
    typeConfig[type] ?? {
      label: type,
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      icon: CreditCard,
    }
  );
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: currency || 'TWD',
    minimumFractionDigits: 0,
  }).format(amount);
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    completed: '完成',
    pending: '處理中',
    failed: '失敗',
    processing: '處理中',
    rejected: '已拒絕',
  };
  return map[status] ?? status;
}

function statusVariant(status: string) {
  if (status === 'completed') return 'success' as const;
  if (status === 'failed' || status === 'rejected') return 'destructive' as const;
  return 'warning' as const;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function TransactionHistoryPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);

  /* ---------- initial load ---------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await paymentsApi.getTransactions();
        if (cancelled) return;
        setTransactions(res.transactions as unknown as Transaction[]);
        setNextCursor(res.nextCursor);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '無法載入交易記錄');
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

  /* ---------- load more ---------- */
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await paymentsApi.getTransactions(nextCursor);
      setTransactions((prev) => [
        ...prev,
        ...(res.transactions as unknown as Transaction[]),
      ]);
      setNextCursor(res.nextCursor);
    } catch {
      /* silent */
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-6 w-24" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-5 w-16" />
          </Card>
        ))}
      </div>
    );
  }

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
          onClick={() => router.push('/wallet')}
          className="rounded-full p-1 transition-colors hover:bg-gray-100"
          aria-label="返回錢包"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">交易記錄</h1>
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <CreditCard className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">沒有交易記錄</h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            你的交易記錄會顯示在這裡
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
                      config.bgColor
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
                          config.color
                        )}
                      >
                        {config.label}
                      </Badge>
                      <Badge variant={statusVariant(tx.status)} className="text-[10px]">
                        {statusLabel(tx.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {timeAgo(tx.createdAt)}
                    </p>
                  </div>

                  {/* Amount */}
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      tx.type === 'withdrawal'
                        ? 'text-orange-600'
                        : 'text-gray-900'
                    )}
                  >
                    {tx.type === 'withdrawal' ? '-' : '+'}
                    {formatAmount(Math.abs(tx.amount), tx.currency)}
                  </p>
                </Card>

                {idx < transactions.length - 1 && <Separator className="my-1" />}
              </div>
            );
          })}

          {/* Load more */}
          {nextCursor && (
            <div className="pt-2 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                載入更多
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
