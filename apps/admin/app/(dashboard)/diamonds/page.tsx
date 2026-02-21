'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  Gem,
  ShoppingCart,
  TrendingDown,
  Gift,
  ArrowRightLeft,
  Users,
  BarChart3,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { StatsCard } from '@/components/stats-card';
import { Card, CardHeader, CardTitle, CardContent } from '@suggar-daddy/ui';

export default function DiamondsPage() {
  const { t } = useTranslation('diamonds');
  const stats = useAdminQuery(() => adminApi.getDiamondStats());
  const purchases = useAdminQuery(() => adminApi.listDiamondPurchases(1, 10));
  const transactions = useAdminQuery(() => adminApi.listDiamondTransactions(1, 10));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          <Link
            href="/diamonds/packages"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('managePackages')}
          </Link>
          <Link
            href="/diamonds/config"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            {t('pricingConfig')}
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[100px] animate-pulse rounded-lg bg-muted" />
          ))
        ) : (
          <>
            <StatsCard
              title={t('stats.inCirculation')}
              value={(stats.data?.totalInCirculation ?? 0).toLocaleString()}
              icon={Gem}
              description={t('stats.inCirculationDesc')}
            />
            <StatsCard
              title={t('stats.totalPurchased')}
              value={(stats.data?.totalPurchased ?? 0).toLocaleString()}
              icon={ShoppingCart}
              description={t('stats.totalPurchasedDesc')}
            />
            <StatsCard
              title={t('stats.totalSpent')}
              value={(stats.data?.totalSpent ?? 0).toLocaleString()}
              icon={TrendingDown}
              description={t('stats.totalSpentDesc')}
            />
            <StatsCard
              title={t('stats.totalConverted')}
              value={(stats.data?.totalConverted ?? 0).toLocaleString()}
              icon={ArrowRightLeft}
              description={t('stats.totalConvertedDesc')}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title={t('stats.totalReceived')}
          value={stats.loading ? '...' : (stats.data?.totalReceived ?? 0).toLocaleString()}
          icon={Gift}
        />
        <StatsCard
          title={t('stats.usersWithBalance')}
          value={stats.loading ? '...' : (stats.data?.userCount ?? 0).toLocaleString()}
          icon={Users}
        />
        <StatsCard
          title={t('stats.averageBalance')}
          value={stats.loading ? '...' : (stats.data?.averageBalance ?? 0).toLocaleString()}
          icon={BarChart3}
        />
      </div>

      {/* Recent Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Purchases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('recentPurchases')}</CardTitle>
            <Link href="/diamonds/purchases" className="text-sm text-primary hover:underline">
              {t('viewAll')}
            </Link>
          </CardHeader>
          <CardContent>
            {purchases.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : !purchases.data?.data.length ? (
              <p className="text-sm text-muted-foreground">{t('noPurchases')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">{t('table.user')}</th>
                      <th className="pb-2 font-medium">{t('table.diamonds')}</th>
                      <th className="pb-2 font-medium">{t('table.usd')}</th>
                      <th className="pb-2 font-medium">{t('table.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.data.data.map((p) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="py-2">
                          <span className="font-mono text-xs">
                            {p.user?.displayName || p.userId.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-2">{p.totalDiamonds.toLocaleString()}</td>
                        <td className="py-2">${Number(p.amountUsd).toFixed(2)}</td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('recentTransactions')}</CardTitle>
            <Link href="/diamonds/transactions" className="text-sm text-primary hover:underline">
              {t('viewAll')}
            </Link>
          </CardHeader>
          <CardContent>
            {transactions.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                ))}
              </div>
            ) : !transactions.data?.data.length ? (
              <p className="text-sm text-muted-foreground">{t('noTransactions')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">{t('table.user')}</th>
                      <th className="pb-2 font-medium">{t('table.type')}</th>
                      <th className="pb-2 font-medium">{t('table.amount')}</th>
                      <th className="pb-2 font-medium">{t('table.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.data.data.map((txn) => (
                      <tr key={txn.id} className="border-b last:border-0">
                        <td className="py-2">
                          <span className="font-mono text-xs">
                            {txn.user?.displayName || txn.userId.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            {txn.type}
                          </span>
                        </td>
                        <td className={`py-2 font-medium ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.amount > 0 ? '+' : ''}{txn.amount}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(txn.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
