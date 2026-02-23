'use client';

import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
} from '@suggar-daddy/ui';
import { BarChart3, Shield, AlertTriangle, XCircle, FileText } from 'lucide-react';

export default function ModerationStatsPage() {
  const { data: stats, isLoading } = useAdminQuery(
    ['moderation-stats'],
    () => adminApi.getModerationStats(),
  );

  const { data: contentStats } = useAdminQuery(
    ['content-stats'],
    () => adminApi.getContentStats(),
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Moderation Statistics</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Posts',
      value: stats?.totalPosts ?? 0,
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Flagged Items',
      value: stats?.flaggedCount ?? 0,
      icon: AlertTriangle,
      color: 'text-yellow-600',
    },
    {
      title: 'Pending Reports',
      value: stats?.pendingReports ?? 0,
      icon: Shield,
      color: 'text-orange-600',
    },
    {
      title: 'Taken Down',
      value: stats?.takenDownCount ?? 0,
      icon: XCircle,
      color: 'text-red-600',
    },
    {
      title: 'Total Reports',
      value: (contentStats?.pendingReports ?? 0) + (contentStats?.resolvedReports ?? 0),
      icon: BarChart3,
      color: 'text-purple-600',
    },
    {
      title: 'Resolved Reports',
      value: contentStats?.resolvedReports ?? 0,
      icon: Shield,
      color: 'text-green-600',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Moderation Statistics</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Moderation Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Auto-moderation rate</span>
              <span className="text-sm font-medium">
                {stats?.totalPosts
                  ? ((stats.flaggedCount / stats.totalPosts) * 100).toFixed(1) + '%'
                  : '0%'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Takedown rate</span>
              <span className="text-sm font-medium">
                {stats?.totalPosts
                  ? ((stats.takenDownCount / stats.totalPosts) * 100).toFixed(2) + '%'
                  : '0%'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Report resolution rate</span>
              <span className="text-sm font-medium">
                {contentStats
                  ? (
                      (contentStats.resolvedReports /
                        Math.max(1, contentStats.pendingReports + contentStats.resolvedReports)) *
                      100
                    ).toFixed(1) + '%'
                  : '0%'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
