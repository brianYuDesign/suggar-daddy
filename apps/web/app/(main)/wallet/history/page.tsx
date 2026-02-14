'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowDownLeft,
  CreditCard,
  Gift,
  Loader2,
  Filter,
  ShoppingBag,
  MessageCircle,
} from 'lucide-react';
import {
  Button,
  Card,
  Badge,
  Skeleton,
  Select,
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

type TransactionTypeFilter = 'all' | 'TIP' | 'SUBSCRIPTION' | 'POST_PURCHASE' | 'DM_PURCHASE' | 'WITHDRAWAL';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
const typeConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: typeof Gift; isExpense: boolean }
> = {
  TIP: {
    label: '打賞',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: Gift,
    isExpense: false,
  },
  tip: {
    label: '打賞',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    icon: Gift,
    isExpense: false,
  },
  SUBSCRIPTION: {
    label: '訂閱',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: CreditCard,
    isExpense: false,
  },
  subscription: {
    label: '訂閱',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: CreditCard,
    isExpense: false,
  },
  POST_PURCHASE: {
    label: '貼文購買',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: ShoppingBag,
    isExpense: false,
  },
  purchase: {
    label: '購買',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    icon: ShoppingBag,
    isExpense: false,
  },
  DM_PURCHASE: {
    label: '私訊購買',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    icon: MessageCircle,
    isExpense: false,
  },
  WITHDRAWAL: {
    label: '提款',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: ArrowDownLeft,
    isExpense: true,
  },
  withdrawal: {
    label: '提款',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: ArrowDownLeft,
    isExpense: true,
  },
};

function getTypeConfig(type: string) {
  return (
    typeConfig[type] ?? {
      label: type,
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      icon: CreditCard,
      isExpense: false,
    }
  );
}

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: currency || 'TWD',
    minimumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    completed: '完成',
    COMPLETED: '完成',
    pending: '處理中',
    PENDING: '處理中',
    failed: '失敗',
    FAILED: '失敗',
    processing: '處理中',
    rejected: '已拒絕',
    REFUNDED: '已退款',
    CANCELLED: '已取消',
  };
  return map[status] ?? status;
}

function statusVariant(status: string) {
  const s = status.toLowerCase();
  if (s === 'completed') return 'success' as const;
  if (s === 'failed' || s === 'rejected' || s === 'cancelled') return 'destructive' as const;
  return 'warning' as const;
}

const filterOptions: { value: TransactionTypeFilter; label: string }[] = [
  { value: 'all', label: '全部類型' },
  { value: 'TIP', label: '打賞' },
  { value: 'SUBSCRIPTION', label: '訂閱' },
  { value: 'POST_PURCHASE', label: '貼文購買' },
  { value: 'DM_PURCHASE', label: '私訊購買' },
  { value: 'WITHDRAWAL', label: '提款' },
];

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

  // Filters
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Intersection Observer ref
  const sentinelRef = useRef<HTMLDivElement>(null);

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

  /* ---------- Intersection Observer for infinite scroll ---------- */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  /* ---------- client-side filtering ---------- */
  const filteredTransactions = transactions.filter((tx) => {
    // Type filter
    if (typeFilter !== 'all') {
      const txType = tx.type.toUpperCase();
      if (txType !== typeFilter && tx.type !== typeFilter.toLowerCase()) {
        return false;
      }
    }

    // Date range filter
    if (dateFrom) {
      const txDate = new Date(tx.createdAt);
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (txDate < fromDate) return false;
    }

    if (dateTo) {
      const txDate = new Date(tx.createdAt);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (txDate > toDate) return false;
    }

    return true;
  });

  /* ---------- render: loading ---------- */
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
          onClick={() => router.push('/wallet')}
          className="rounded-full p-1 transition-colors hover:bg-gray-100"
          aria-label="返回錢包"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">交易記錄</h1>
      </div>

      {/* Filters */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          篩選
        </div>

        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TransactionTypeFilter)}
          className="text-sm"
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs text-gray-500">開始日期</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">結束日期</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {(typeFilter !== 'all' || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500"
            onClick={() => {
              setTypeFilter('all');
              setDateFrom('');
              setDateTo('');
            }}
          >
            清除篩選
          </Button>
        )}
      </Card>

      {/* Transaction list */}
      {filteredTransactions.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <CreditCard className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {transactions.length === 0 ? '沒有交易記錄' : '沒有符合條件的交易'}
          </h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            {transactions.length === 0
              ? '你的交易記錄會顯示在這裡'
              : '請嘗試調整篩選條件'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((tx, idx) => {
            const config = getTypeConfig(tx.type);
            const Icon = config.icon;
            const isExpense = config.isExpense;

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
                      isExpense ? 'text-red-600' : 'text-green-600'
                    )}
                  >
                    {isExpense ? '-' : '+'}
                    {formatAmount(tx.amount, tx.currency)}
                  </p>
                </Card>

                {idx < filteredTransactions.length - 1 && (
                  <Separator className="my-1" />
                )}
              </div>
            );
          })}

          {/* Infinite scroll sentinel */}
          {nextCursor && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore && (
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
