'use client';

import { Users, FileText, CreditCard, Activity, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { StatsCard } from '@/components/stats-card';
import { SimpleBarChart } from '@/components/simple-chart';
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@suggar-daddy/ui';
import { HealthBadge } from '@/components/health-badge';

export default function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const userStats = useAdminQuery(() => adminApi.getUserStats());
  const contentStats = useAdminQuery(() => adminApi.getContentStats());
  const paymentStats = useAdminQuery(() => adminApi.getPaymentStats());
  const withdrawalStats = useAdminQuery(() => adminApi.getWithdrawalStats());
  const systemHealth = useAdminQuery(() => adminApi.getSystemHealth());
  const dailyRevenue = useAdminQuery(() => adminApi.getDailyRevenue(14));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {userStats.loading ? (
          <Skeleton className="h-[100px]" />
        ) : (
          <StatsCard
            title={t('stats.totalUsers')}
            value={userStats.data?.totalUsers ?? 0}
            icon={Users}
            description={t('stats.newThisWeek', { count: userStats.data?.newUsersThisWeek ?? 0 })}
          />
        )}
        {contentStats.loading ? (
          <Skeleton className="h-[100px]" />
        ) : (
          <StatsCard
            title={t('stats.totalPosts')}
            value={contentStats.data?.totalPosts ?? 0}
            icon={FileText}
            description={t('stats.pendingReports', { count: contentStats.data?.pendingReports ?? 0 })}
          />
        )}
        {paymentStats.loading ? (
          <Skeleton className="h-[100px]" />
        ) : (
          <StatsCard
            title={t('stats.totalRevenue')}
            value={`$${(paymentStats.data?.totalAmount ?? 0).toLocaleString()}`}
            icon={CreditCard}
            description={t('stats.successRate', { rate: paymentStats.data?.successRate ?? 0 })}
          />
        )}
        {withdrawalStats.loading ? (
          <Skeleton className="h-[100px]" />
        ) : (
          <StatsCard
            title={t('stats.pendingWithdrawals')}
            value={withdrawalStats.data?.pendingCount ?? 0}
            icon={Wallet}
            description={t('stats.toReview', { amount: (withdrawalStats.data?.pendingAmount ?? 0).toLocaleString() })}
          />
        )}
        {systemHealth.loading ? (
          <Skeleton className="h-[100px]" />
        ) : (
          <StatsCard
            title={t('stats.systemStatus')}
            value={systemHealth.data?.status === 'healthy' ? 'Healthy' : systemHealth.data?.status ?? 'Unknown'}
            icon={Activity}
          />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('charts.dailyRevenue')}</CardTitle>
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
              <p className="py-8 text-center text-sm text-muted-foreground">{t('charts.noRevenueData')}</p>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('charts.systemHealth')}</CardTitle>
          </CardHeader>
          <CardContent>
            {systemHealth.loading ? (
              <Skeleton className="h-[200px]" />
            ) : systemHealth.data ? (
              <div className="space-y-4">
                {Object.entries(systemHealth.data.services).map(([name, svc]) => (
                  <div key={name} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium capitalize">{name}</p>
                      {svc.latencyMs !== undefined && (
                        <p className="text-xs text-muted-foreground">{svc.latencyMs}ms</p>
                      )}
                    </div>
                    <HealthBadge status={svc.status} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('charts.unableToFetch')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('sections.usersByRole')}</CardTitle>
          </CardHeader>
          <CardContent>
            {userStats.loading ? (
              <Skeleton className="h-[100px]" />
            ) : userStats.data?.byRole ? (
              <div className="space-y-2">
                {Object.entries(userStats.data.byRole).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{role}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Content Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('sections.contentModeration')}</CardTitle>
          </CardHeader>
          <CardContent>
            {contentStats.loading ? (
              <Skeleton className="h-[100px]" />
            ) : contentStats.data ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">{t('sections.pendingReports')}</span>
                  <span className="text-sm font-medium text-yellow-600">
                    {contentStats.data.pendingReports}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">{t('sections.resolvedReports')}</span>
                  <span className="text-sm font-medium text-green-600">
                    {contentStats.data.resolvedReports}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">{t('sections.takenDown')}</span>
                  <span className="text-sm font-medium text-destructive">
                    {contentStats.data.takenDownCount}
                  </span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
