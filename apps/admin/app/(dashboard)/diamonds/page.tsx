'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  const stats = useAdminQuery(() => adminApi.getDiamondStats());
  const purchases = useAdminQuery(() => adminApi.listDiamondPurchases(1, 10));
  const transactions = useAdminQuery(() => adminApi.listDiamondTransactions(1, 10));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Diamond Economy</h1>
        <div className="flex gap-2">
          <Link
            href="/diamonds/packages"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Manage Packages
          </Link>
          <Link
            href="/diamonds/config"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Pricing Config
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
              title="In Circulation"
              value={(stats.data?.totalInCirculation ?? 0).toLocaleString()}
              icon={Gem}
              description="Total diamonds held by users"
            />
            <StatsCard
              title="Total Purchased"
              value={(stats.data?.totalPurchased ?? 0).toLocaleString()}
              icon={ShoppingCart}
              description="All-time purchased diamonds"
            />
            <StatsCard
              title="Total Spent"
              value={(stats.data?.totalSpent ?? 0).toLocaleString()}
              icon={TrendingDown}
              description="Diamonds spent on features"
            />
            <StatsCard
              title="Total Converted"
              value={(stats.data?.totalConverted ?? 0).toLocaleString()}
              icon={ArrowRightLeft}
              description="Converted to cash"
            />
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Total Received"
          value={stats.loading ? '...' : (stats.data?.totalReceived ?? 0).toLocaleString()}
          icon={Gift}
        />
        <StatsCard
          title="Users with Balance"
          value={stats.loading ? '...' : (stats.data?.userCount ?? 0).toLocaleString()}
          icon={Users}
        />
        <StatsCard
          title="Average Balance"
          value={stats.loading ? '...' : (stats.data?.averageBalance ?? 0).toLocaleString()}
          icon={BarChart3}
        />
      </div>

      {/* Recent Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Purchases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Purchases</CardTitle>
            <Link href="/diamonds/purchases" className="text-sm text-primary hover:underline">
              View all
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
              <p className="text-sm text-muted-foreground">No purchases yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Diamonds</th>
                      <th className="pb-2 font-medium">USD</th>
                      <th className="pb-2 font-medium">Status</th>
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
            <CardTitle>Recent Transactions</CardTitle>
            <Link href="/diamonds/transactions" className="text-sm text-primary hover:underline">
              View all
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
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Amount</th>
                      <th className="pb-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.data.data.map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="py-2">
                          <span className="font-mono text-xs">
                            {t.user?.displayName || t.userId.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-2">
                          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                            {t.type}
                          </span>
                        </td>
                        <td className={`py-2 font-medium ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {t.amount > 0 ? '+' : ''}{t.amount}
                        </td>
                        <td className="py-2 text-muted-foreground">
                          {new Date(t.createdAt).toLocaleDateString()}
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
