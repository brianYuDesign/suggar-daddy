'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { StatsCard } from '@/components/stats-card';
import { SimpleBarChart } from '@/components/simple-chart';
import { CsvExport } from '@/components/csv-export';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Select, Skeleton } from '@suggar-daddy/ui';
import { CreditCard, TrendingUp, BarChart3, Percent } from 'lucide-react';

function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function PaymentsPage() {
  const [days, setDays] = useState(30);
  const defaultDates = getDefaultDates();
  const [startDate, setStartDate] = useState(defaultDates.start);
  const [endDate, setEndDate] = useState(defaultDates.end);

  const stats = useAdminQuery(() => adminApi.getPaymentStats());
  const dailyRevenue = useAdminQuery(() => adminApi.getDailyRevenue(days), [days]);
  const topCreators = useAdminQuery(() => adminApi.getTopCreators(10));
  const revenue = useAdminQuery(
    () => adminApi.getRevenueReport(startDate, endDate),
    [startDate, endDate],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Payments</h1>
        <CsvExport
          data={dailyRevenue.data}
          columns={[
            { key: 'date', label: 'Date' },
            { key: 'revenue', label: 'Revenue' },
            { key: 'count', label: 'Count' },
          ]}
          filename="daily-revenue"
        />
      </div>

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

      {/* Revenue Report with Date Range */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Revenue Report</CardTitle>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
          />
        </CardHeader>
        <CardContent>
          {revenue.loading ? (
            <Skeleton className="h-[100px]" />
          ) : revenue.data ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="mt-1 text-2xl font-bold">${revenue.data.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="mt-1 text-2xl font-bold">{revenue.data.transactionCount}</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">Types</p>
                <div className="mt-1 space-y-1">
                  {Object.entries(revenue.data.byType).map(([type, info]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span>{type}</span>
                      <span className="font-medium">${info.amount.toLocaleString()} ({info.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No data for selected range</p>
          )}
        </CardContent>
      </Card>

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
