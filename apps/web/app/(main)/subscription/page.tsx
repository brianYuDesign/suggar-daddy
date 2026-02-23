'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Crown, Check, Loader2, AlertCircle } from 'lucide-react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Badge,
  Skeleton,
  cn,
} from '@suggar-daddy/ui';
import { subscriptionsApi, ApiError } from '../../../lib/api';

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */
interface SubscriptionTier {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
}

interface Subscription {
  id: string;
  userId: string;
  tierId: string;
  status: string;
  currentPeriodEnd: string | null;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function SubscriptionPage() {
  const [tiers, setTiers] = useState<SubscriptionTier[]>([]);
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  /* 幂等性保護 - 防止重複點擊 */
  const lastActionRef = useRef<{ action: string; timestamp: number } | null>(null);
  const DEBOUNCE_MS = 2000; // 2 秒內不允許重複操作
  
  /* 確認對話框狀態 */
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSubscribeConfirm, setShowSubscribeConfirm] = useState<{
    tier: SubscriptionTier;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [tiersData, subData] = await Promise.allSettled([
          subscriptionsApi.getTiers(),
          subscriptionsApi.getMySubscription(),
        ]);

        if (cancelled) return;

        if (tiersData.status === 'fulfilled') {
          const raw = tiersData.value;
          const allTiers = Array.isArray(raw) ? (raw as unknown as SubscriptionTier[]) : [];
          // 去重：按 name 分組，每個 name 只取第一個
          const seen = new Map<string, SubscriptionTier>();
          for (const tier of allTiers) {
            if (!seen.has(tier.name)) {
              seen.set(tier.name, tier);
            }
          }
          setTiers(Array.from(seen.values()));
        }

        if (subData.status === 'fulfilled' && subData.value) {
          setCurrentSub(subData.value as unknown as Subscription);
        }
        // null or 404 means no subscription — that's fine
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '無法載入方案');
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

  /* ---------- actions ---------- */
  
  /**
   * 防抖檢查 - 防止短時間內重複操作
   */
  const canPerformAction = useCallback((actionId: string): boolean => {
    const now = Date.now();
    const last = lastActionRef.current;
    
    if (last && last.action === actionId && (now - last.timestamp) < DEBOUNCE_MS) {
      return false; // 在防抖時間內
    }
    
    return true;
  }, []);
  
  /**
   * 記錄操作時間
   */
  const recordAction = useCallback((actionId: string) => {
    lastActionRef.current = {
      action: actionId,
      timestamp: Date.now(),
    };
  }, []);
  
  /**
   * 訂閱方案 - 顯示確認對話框
   */
  const handleSubscribeClick = useCallback((tier: SubscriptionTier) => {
    if (!canPerformAction(`subscribe-${tier.id}`)) {
      return; // 忽略重複點擊
    }
    
    setShowSubscribeConfirm({ tier });
  }, [canPerformAction]);
  
  /**
   * 確認訂閱
   */
  const confirmSubscribe = useCallback(async () => {
    if (!showSubscribeConfirm) return;
    
    const { tier } = showSubscribeConfirm;
    const actionId = `subscribe-${tier.id}`;
    
    setShowSubscribeConfirm(null);
    setActionLoading(tier.id);
    recordAction(actionId);
    
    try {
      const sub = await subscriptionsApi.subscribe(tier.id) as unknown as Subscription;
      setCurrentSub(sub);
    } catch (err) {
      // 顯示錯誤訊息（可以加 toast）
      console.error('Subscription failed:', err);
    } finally {
      setActionLoading(null);
    }
  }, [showSubscribeConfirm, recordAction]);
  
  /**
   * 取消訂閱 - 顯示確認對話框
   */
  const handleCancelClick = useCallback(() => {
    if (!currentSub || !canPerformAction('cancel')) {
      return;
    }
    
    setShowCancelConfirm(true);
  }, [currentSub, canPerformAction]);
  
  /**
   * 確認取消訂閱
   */
  const confirmCancel = useCallback(async () => {
    if (!currentSub) return;
    
    setShowCancelConfirm(false);
    setActionLoading('cancel');
    recordAction('cancel');
    
    try {
      await subscriptionsApi.cancel();
      setCurrentSub(null);
    } catch (err) {
      console.error('Cancel failed:', err);
    } finally {
      setActionLoading(null);
    }
  }, [currentSub, recordAction]);

  /* ---------- helpers ---------- */
  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: currency || 'USD' }).format(amount);
  }

  function isCurrentTier(tierId: string) {
    return currentSub?.tierId === tierId && currentSub?.status === 'active';
  }

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">訂閱方案</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="space-y-4 p-6">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-8 w-20" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 text-white">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6 text-gold-400" />
          <h1 className="text-xl font-bold">訂閱方案</h1>
        </div>
        <p className="mt-1 text-sm text-neutral-300">
          選擇最適合你的方案，解鎖完整體驗
        </p>
      </div>

      {/* Current subscription info */}
      {currentSub && (
        <Card className="border-gold-200 bg-gold-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gold-600">目前方案</p>
              <p className="text-xs text-gold-600">
                {currentSub.currentPeriodEnd
                  ? `到期日：${new Date(currentSub.currentPeriodEnd).toLocaleDateString('zh-TW')}`
                  : '持續訂閱中'}
              </p>
            </div>
            <Badge className="bg-gold-500 text-white">
              {currentSub.status === 'active' ? '使用中' : currentSub.status}
            </Badge>
          </div>
        </Card>
      )}

      {/* Tier cards */}
      {tiers.length === 0 && (
        <Card className="p-8 text-center">
          <Crown className="mx-auto h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">目前尚無訂閱方案</p>
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = isCurrentTier(tier.id);

          return (
            <Card
              key={tier.id}
              className={cn(
                'flex flex-col transition-shadow hover:shadow-md',
                isCurrent && 'border-2 border-gold-400 ring-2 ring-gold-200'
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  {isCurrent && (
                    <Badge className="bg-gold-500 text-white">目前方案</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-neutral-900">
                  {formatCurrency(tier.price, tier.currency)}
                  <span className="text-sm font-normal text-gray-500"> / 月</span>
                </p>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                {isCurrent ? (
                  <Button
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                    onClick={handleCancelClick}
                    disabled={actionLoading === 'cancel'}
                  >
                    {actionLoading === 'cancel' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    取消訂閱
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-neutral-900 hover:bg-neutral-800"
                    onClick={() => handleSubscribeClick(tier)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === tier.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    立即訂閱
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
      
      {/* 訂閱確認對話框 */}
      {showSubscribeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">確認訂閱</h2>
            <p className="mt-2 text-sm text-gray-600">
              您即將訂閱 <span className="font-semibold">{showSubscribeConfirm.tier.name}</span>
            </p>
            <div className="mt-3 rounded-lg bg-gold-50 p-3">
              <p className="text-2xl font-bold text-neutral-900">
                {formatCurrency(showSubscribeConfirm.tier.price, showSubscribeConfirm.tier.currency)}
                <span className="text-sm font-normal text-gray-500"> / 月</span>
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-400">
              訂閱後將自動扣款，您可以隨時取消訂閱。
            </p>
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowSubscribeConfirm(null)}
                disabled={!!actionLoading}
              >
                取消
              </Button>
              <Button
                className="flex-1 bg-neutral-900 hover:bg-neutral-800"
                onClick={confirmSubscribe}
                disabled={!!actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                確認訂閱
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* 取消訂閱確認對話框 */}
      {showCancelConfirm && currentSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900">確認取消訂閱</h2>
                <p className="mt-2 text-sm text-gray-600">
                  取消訂閱後，您將無法繼續享受會員權益。訂閱將在當前週期結束後停止。
                </p>
                {currentSub.currentPeriodEnd && (
                  <p className="mt-2 text-xs text-gray-500">
                    到期日：{new Date(currentSub.currentPeriodEnd).toLocaleDateString('zh-TW')}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCancelConfirm(false)}
                disabled={actionLoading === 'cancel'}
              >
                保留訂閱
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmCancel}
                disabled={actionLoading === 'cancel'}
              >
                {actionLoading === 'cancel' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                確認取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
