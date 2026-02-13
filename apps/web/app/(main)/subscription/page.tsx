'use client';

import { useEffect, useState } from 'react';
import { Crown, Check, Loader2 } from 'lucide-react';
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
  currentPeriodEnd: string;
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
          setTiers(tiersData.value as unknown as SubscriptionTier[]);
        }

        if (subData.status === 'fulfilled') {
          setCurrentSub(subData.value as unknown as Subscription);
        }
        // 404 means no subscription — that's fine
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
  async function handleSubscribe(tierId: string) {
    setActionLoading(tierId);
    try {
      const sub = (await subscriptionsApi.subscribe(tierId)) as unknown as Subscription;
      setCurrentSub(sub);
    } catch (err) {
      /* optionally show toast */
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCancel() {
    if (!currentSub) return;
    setActionLoading('cancel');
    try {
      await subscriptionsApi.cancel();
      setCurrentSub(null);
    } catch {
      /* optionally show toast */
    } finally {
      setActionLoading(null);
    }
  }

  /* ---------- helpers ---------- */
  function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('zh-TW', { style: 'currency', currency }).format(amount);
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
      <div className="rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 p-6 text-white">
        <div className="flex items-center gap-2">
          <Crown className="h-6 w-6" />
          <h1 className="text-xl font-bold">訂閱方案</h1>
        </div>
        <p className="mt-1 text-sm text-brand-100">
          選擇最適合你的方案，解鎖完整體驗
        </p>
      </div>

      {/* Current subscription info */}
      {currentSub && (
        <Card className="border-brand-200 bg-brand-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-brand-800">目前方案</p>
              <p className="text-xs text-brand-600">
                到期日：{new Date(currentSub.currentPeriodEnd).toLocaleDateString('zh-TW')}
              </p>
            </div>
            <Badge className="bg-brand-500 text-white">
              {currentSub.status === 'active' ? '使用中' : currentSub.status}
            </Badge>
          </div>
        </Card>
      )}

      {/* Tier cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => {
          const isCurrent = isCurrentTier(tier.id);

          return (
            <Card
              key={tier.id}
              className={cn(
                'flex flex-col transition-shadow hover:shadow-md',
                isCurrent && 'border-2 border-brand-500 ring-2 ring-brand-200'
              )}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                  {isCurrent && (
                    <Badge className="bg-brand-500 text-white">目前方案</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold text-brand-600">
                  {formatCurrency(tier.price, tier.currency)}
                  <span className="text-sm font-normal text-gray-500"> / 月</span>
                </p>
              </CardHeader>

              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
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
                    onClick={handleCancel}
                    disabled={actionLoading === 'cancel'}
                  >
                    {actionLoading === 'cancel' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    取消訂閱
                  </Button>
                ) : (
                  <Button
                    className="w-full bg-brand-500 hover:bg-brand-600"
                    onClick={() => handleSubscribe(tier.id)}
                    disabled={actionLoading === tier.id}
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
    </div>
  );
}
