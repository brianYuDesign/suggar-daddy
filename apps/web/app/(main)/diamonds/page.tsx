'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Gem,
  History,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Badge,
  Skeleton,
  cn,
} from '@suggar-daddy/ui';
import { paymentsApi, ApiError } from '../../../lib/api';
import { useToast } from '../../../providers/toast-provider';

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */
interface DiamondBalance {
  balance: number;
  totalPurchased: number;
  totalSpent: number;
  totalReceived: number;
  totalConverted: number;
  updatedAt: string;
}

interface DiamondPackage {
  id: string;
  name: string;
  diamondAmount: number;
  bonusDiamonds: number;
  priceUsd: number;
  isActive: boolean;
  sortOrder: number;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function DiamondStorePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [balance, setBalance] = useState<DiamondBalance | null>(null);
  const [packages, setPackages] = useState<DiamondPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);

  /* ---------- handle success / cancelled query params ---------- */
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      toast.success('鑽石購買成功！已加入您的帳戶');
      router.replace('/diamonds');
    } else if (status === 'cancelled') {
      toast.warning('購買已取消');
      router.replace('/diamonds');
    }
  }, [searchParams, toast, router]);

  /* ---------- load data ---------- */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [balData, pkgData] = await Promise.allSettled([
          paymentsApi.getDiamondBalance(),
          paymentsApi.getDiamondPackages(),
        ]);

        if (cancelled) return;

        if (balData.status === 'fulfilled') {
          setBalance(balData.value as unknown as DiamondBalance);
        }

        if (pkgData.status === 'fulfilled') {
          const raw = pkgData.value;
          const list = (Array.isArray(raw) ? raw : []) as unknown as DiamondPackage[];
          setPackages(
            list
              .filter((p) => p.isActive)
              .sort((a, b) => a.sortOrder - b.sortOrder),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '無法載入鑽石商店');
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
  async function handlePurchase(pkg: DiamondPackage) {
    if (purchaseLoading) return;
    setPurchaseLoading(pkg.id);
    try {
      const res = await paymentsApi.purchaseDiamonds(pkg.id);
      if (res.sessionUrl) {
        window.location.href = res.sessionUrl;
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : '購買失敗，請稍後再試');
    } finally {
      setPurchaseLoading(null);
    }
  }

  /* ---------- helpers ---------- */
  function formatNumber(n: number) {
    return new Intl.NumberFormat('zh-TW').format(n);
  }

  function formatUsd(amount: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  function isPremium(pkg: DiamondPackage) {
    return pkg.name.toLowerCase().includes('premium') || pkg.name === 'Premium';
  }

  /* ---------- render: loading ---------- */
  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">鑽石商店</h1>
        {/* Balance skeleton */}
        <div className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 p-6">
          <Skeleton className="mb-2 h-5 w-20 bg-white/20" />
          <Skeleton className="h-9 w-32 bg-white/20" />
        </div>
        {/* Package skeletons */}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-4">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </Card>
          ))}
        </div>
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
    <div className="space-y-6">
      {/* Header — balance banner */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gem className="h-6 w-6" />
              <h1 className="text-xl font-bold">鑽石商店</h1>
            </div>
            <p className="mt-2 text-3xl font-bold">
              {formatNumber(balance?.balance ?? 0)}
            </p>
            <p className="text-sm text-violet-200">目前鑽石餘額</p>
          </div>
          <div className="text-5xl">💎</div>
        </div>
      </div>

      {/* Quick link to history */}
      <Link
        href="/diamonds/history"
        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <History className="h-4 w-4 text-violet-500" />
        查看鑽石交易紀錄
      </Link>

      {/* Package cards */}
      {packages.length === 0 ? (
        <Card className="p-8 text-center">
          <Gem className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">目前尚無鑽石方案</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {packages.map((pkg) => {
            const premium = isPremium(pkg);
            const totalDiamonds = pkg.diamondAmount + pkg.bonusDiamonds;

            return (
              <Card
                key={pkg.id}
                className={cn(
                  'relative flex flex-col transition-shadow hover:shadow-md',
                  premium && 'border-2 border-violet-400 ring-2 ring-violet-200',
                )}
              >
                {/* Best value badge */}
                {premium && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-violet-500 text-white shadow-sm">
                      <Sparkles className="mr-1 h-3 w-3" />
                      最划算
                    </Badge>
                  </div>
                )}

                <CardHeader className={cn('pb-2', premium && 'pt-5')}>
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                </CardHeader>

                <CardContent className="flex-1 pb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-violet-600">
                      {formatNumber(pkg.diamondAmount)}
                    </span>
                    <span className="text-xs text-gray-500">💎</span>
                  </div>

                  {pkg.bonusDiamonds > 0 && (
                    <p className="mt-1 text-xs font-medium text-green-600">
                      +{formatNumber(pkg.bonusDiamonds)} 額外贈送
                    </p>
                  )}

                  {pkg.bonusDiamonds > 0 && (
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      共 {formatNumber(totalDiamonds)} 顆鑽石
                    </p>
                  )}

                  <p className="mt-2 text-lg font-bold text-gray-900">
                    {formatUsd(pkg.priceUsd)}
                  </p>
                </CardContent>

                <CardFooter className="pt-0">
                  <Button
                    className={cn(
                      'w-full',
                      premium
                        ? 'bg-violet-500 hover:bg-violet-600'
                        : 'bg-brand-500 hover:bg-brand-600',
                    )}
                    onClick={() => handlePurchase(pkg)}
                    disabled={!!purchaseLoading}
                  >
                    {purchaseLoading === pkg.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    購買
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Stats summary */}
      {balance && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: '累計購買', value: balance.totalPurchased },
            { label: '已花費', value: balance.totalSpent },
            { label: '已收到', value: balance.totalReceived },
            { label: '已兌換', value: balance.totalConverted },
          ].map((stat) => (
            <Card key={stat.label} className="p-3">
              <CardContent className="p-0">
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-sm font-semibold text-gray-900">
                  💎 {formatNumber(stat.value)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
