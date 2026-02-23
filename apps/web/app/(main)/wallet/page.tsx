'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  History,
  CreditCard,
  Clock,
  TrendingUp,
  ArrowUpFromLine,
  Gem,
  ArrowRightLeft,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Skeleton,
} from '@suggar-daddy/ui';
import { paymentsApi, ApiError } from '../../../lib/api';
import type { DiamondBalance } from '@suggar-daddy/api-client';
import { DiamondConvertModal } from '../../components/DiamondConvertModal';

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */
interface Wallet {
  userId: string;
  balance: number;
  pendingBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function WalletPage() {
  const router = useRouter();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [diamondBalance, setDiamondBalance] = useState<DiamondBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [walletData, diamondData] = await Promise.allSettled([
          paymentsApi.getWallet(),
          paymentsApi.getDiamondBalance(),
        ]);
        if (!cancelled) {
          if (walletData.status === 'fulfilled')
            setWallet(walletData.value as unknown as Wallet);
          if (diamondData.status === 'fulfilled')
            setDiamondBalance(diamondData.value);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '無法載入錢包');
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
  async function handleStripePortal() {
    setPortalLoading(true);
    try {
      const res = await paymentsApi.getStripePortal();
      window.open(res.portalUrl, '_blank');
    } catch {
      /* optionally show toast */
    } finally {
      setPortalLoading(false);
    }
  }

  /* ---------- helper ---------- */
  function formatAmount(amount: number) {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /* ---------- render ---------- */
  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900">我的錢包</h1>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="mb-2 h-4 w-16" />
              <Skeleton className="h-7 w-24" />
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

  const balanceCards = [
    {
      label: '可用餘額',
      value: wallet?.balance ?? 0,
      icon: WalletIcon,
      color: 'text-neutral-900',
      bg: 'bg-neutral-50',
    },
    {
      label: '待入帳',
      value: wallet?.pendingBalance ?? 0,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: '累計收入',
      value: wallet?.totalEarnings ?? 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: '已提款',
      value: wallet?.totalWithdrawn ?? 0,
      icon: ArrowUpFromLine,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-neutral-900 to-neutral-800 p-6 text-white">
        <div className="flex items-center gap-2">
          <WalletIcon className="h-6 w-6" />
          <h1 className="text-xl font-bold">我的錢包</h1>
        </div>
        <p className="mt-2 text-3xl font-bold">
          {formatAmount(wallet?.balance ?? 0)}
        </p>
        <p className="text-sm text-neutral-300">可用餘額</p>
      </div>

      {/* Diamond balance section */}
      {diamondBalance && (
        <Card className="overflow-hidden border-violet-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="inline-flex rounded-lg bg-violet-50 p-2">
                  <Gem className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">鑽石餘額</p>
                  <p className="text-xl font-bold text-violet-700">
                    💎 {diamondBalance.balance.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 border-violet-200 text-violet-600 hover:bg-violet-50"
                  onClick={() => setShowConvertModal(true)}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  兌換
                </Button>
                <Button
                  size="sm"
                  className="gap-1 bg-violet-500 text-white hover:bg-violet-600"
                  onClick={() => router.push('/diamonds')}
                >
                  <Gem className="h-3.5 w-3.5" />
                  儲值
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3">
        {balanceCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-4">
              <CardContent className="p-0">
                <div className={`mb-2 inline-flex rounded-lg p-2 ${card.bg}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <p className="text-xs text-gray-500">{card.label}</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatAmount(card.value)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">快速操作</h2>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => router.push('/wallet/withdraw')}
          >
            <ArrowDownToLine className="h-5 w-5 text-neutral-700" />
            <span className="text-sm">提款</span>
          </Button>

          <Button
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => router.push('/wallet/history')}
          >
            <History className="h-5 w-5 text-neutral-700" />
            <span className="text-sm">交易記錄</span>
          </Button>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={handleStripePortal}
          disabled={portalLoading}
        >
          <CreditCard className="h-4 w-4" />
          {portalLoading ? '載入中...' : 'Stripe 付款管理'}
        </Button>
      </div>

      {/* Diamond convert modal */}
      <DiamondConvertModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
      />
    </div>
  );
}
