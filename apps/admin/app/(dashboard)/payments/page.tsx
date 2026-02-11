'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { StatsCard } from '@/components/stats-card';
import { SimpleBarChart } from '@/components/simple-chart';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Select, Skeleton } from '@suggar-daddy/ui';
import { CreditCard, TrendingUp, BarChart3, Percent } from 'lucide-react';

export default function PaymentsPage() {
  const [days, setDays] = useState(30);

  const stats = useAdminQuery(() => adminApi.getPaymentStats());
  const dailyRevenue = useAdminQuery(() => adminApi.getDailyRevenue(days), [days]);
  const topCreators = useAdminQuery(() => adminApi.getTopCreators(10));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Payments</h1>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px]" />)
        ) : (
          <>
            <StatsCard
              title="Total Revenue"
              value={`$${(stats.data?.totalAmount ?? 0).toLocaleString()}`}
              icon={CreditCard}
            />
            <StatsCard
              title="Transactions"
              value={stats.data?.totalTransactions ?? 0}
              icon={TrendingUp}
              description={`${stats.data?.successfulTransactions ?? 0} successful`}
            />
            <StatsCard
              title="Avg Transaction"
              value={`$${(stats.data?.averageAmount ?? 0).toFixed(2)}`}
              icon={BarChart3}
            />
            <StatsCard
              title="Success Rate"
              value={`${stats.data?.successRate ?? 0}%`}
              icon={Percent}
            />
          </>
        )}
      </div>

      {/* Daily Revenue Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Daily Revenue</CardTitle>
          <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-32">
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </Select>
        </CardHeader>
        <CardContent>
          {dailyRevenue.loading ? (
            <Skeleton className="h-[200px]" />
          ) : dailyRevenue.data && dailyRevenue.data.length > 0 ? (
            <SimpleBarChart
              data={dailyRevenue.data.map((d) => ({
                label: d.date.slice(5),
                value: d.revenue,
              }))}
            />
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No revenue data for this period</p>
          )}
        </CardContent>
      </Card>

      {/* Top Creators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Creators by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {topCreators.loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Creator ID</TableHead>
                  <TableHead>Tip Revenue</TableHead>
                  <TableHead>Tips</TableHead>
                  <TableHead>Subscribers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCreators.data?.map((creator, i) => (
                  <TableRow key={creator.creatorId}>
                    <TableCell className="font-medium">{i + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{creator.creatorId.slice(0, 12)}...</TableCell>
                    <TableCell className="font-medium">${creator.tipRevenue.toLocaleString()}</TableCell>
                    <TableCell>{creator.tipCount}</TableCell>
                    <TableCell>{creator.subscriberCount}</TableCell>
                  </TableRow>
                ))}
                {topCreators.data?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No creator data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
