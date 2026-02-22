'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { StatsCard } from '@/components/stats-card';
import { SimpleBarChart } from '@/components/simple-chart';
import { CsvExport } from '@/components/csv-export';
import { DateRangePicker } from '@/components/date-range-picker';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Select, Skeleton } from '@suggar-daddy/ui';
import { CreditCard, TrendingUp, BarChart3, Percent } from 'lucide-react';

export default function PaymentsPage() {
  const { t } = useTranslation('payments');
  const [days, setDays] = useState(30);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // 避免 hydration mismatch：日期計算僅在 client 端執行
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
  }, []);

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
        <h1 className="text-2xl font-bold">{t('title')}</h1>
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
              title={t('stats.totalRevenue')}
              value={`$${(stats.data?.totalAmount ?? 0).toLocaleString()}`}
              icon={CreditCard}
            />
            <StatsCard
              title={t('stats.transactions')}
              value={stats.data?.totalTransactions ?? 0}
              icon={TrendingUp}
              description={t('stats.successful', { count: stats.data?.successfulTransactions ?? 0 })}
            />
            <StatsCard
              title={t('stats.avgTransaction')}
              value={`$${(stats.data?.averageAmount ?? 0).toFixed(2)}`}
              icon={BarChart3}
            />
            <StatsCard
              title={t('stats.successRate')}
              value={`${stats.data?.successRate ?? 0}%`}
              icon={Percent}
            />
          </>
        )}
      </div>

      {/* Revenue Report with Date Range */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('revenueReport')}</CardTitle>
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
                <p className="text-sm text-muted-foreground">{t('totalRevenue')}</p>
                <p className="mt-1 text-2xl font-bold">${revenue.data.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">{t('transactions')}</p>
                <p className="mt-1 text-2xl font-bold">{revenue.data.transactionCount}</p>
              </div>
              <div className="rounded-md bg-muted p-4">
                <p className="text-sm text-muted-foreground">{t('types')}</p>
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
            <p className="py-4 text-center text-sm text-muted-foreground">{t('noDataForRange')}</p>
          )}
        </CardContent>
      </Card>

      {/* Daily Revenue Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('dailyRevenue')}</CardTitle>
          <Select value={String(days)} onChange={(e) => setDays(Number(e.target.value))} className="w-32">
            <option value="7">{t('days7')}</option>
            <option value="14">{t('days14')}</option>
            <option value="30">{t('days30')}</option>
            <option value="90">{t('days90')}</option>
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
            <p className="py-8 text-center text-sm text-muted-foreground">{t('noRevenueData')}</p>
          )}
        </CardContent>
      </Card>

      {/* Top Creators */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('topCreators')}</CardTitle>
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
                  <TableHead>{t('rank')}</TableHead>
                  <TableHead>{t('creatorId')}</TableHead>
                  <TableHead>{t('tipRevenue')}</TableHead>
                  <TableHead>{t('tips')}</TableHead>
                  <TableHead>{t('subscribers')}</TableHead>
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
                      {t('noCreatorData')}
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
