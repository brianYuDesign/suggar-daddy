'use client';

import { useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { Card, CardHeader, CardTitle, CardContent, Skeleton } from '@suggar-daddy/ui';
import { HealthBadge } from '@/components/health-badge';

export default function SystemPage() {
  const health = useAdminQuery(() => adminApi.getSystemHealth());
  const kafka = useAdminQuery(() => adminApi.getKafkaStatus());
  const dlq = useAdminQuery(() => adminApi.getDlqStats());
  const consistency = useAdminQuery(() => adminApi.getConsistencyMetrics());

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      health.refetch();
      kafka.refetch();
      dlq.refetch();
      consistency.refetch();
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">System Monitor</h1>
        <button
          onClick={() => {
            health.refetch();
            kafka.refetch();
            dlq.refetch();
            consistency.refetch();
          }}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Refresh
        </button>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">System Health</CardTitle>
            {health.data && <HealthBadge status={health.data.status} />}
          </div>
        </CardHeader>
        <CardContent>
          {health.loading ? (
            <Skeleton className="h-[100px]" />
          ) : health.data ? (
            <div className="space-y-3">
              {Object.entries(health.data.services).map(([name, svc]) => (
                <div key={name} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{name}</p>
                    {svc.latencyMs !== undefined && (
                      <p className="text-xs text-muted-foreground">Latency: {svc.latencyMs}ms</p>
                    )}
                    {svc.error && (
                      <p className="text-xs text-destructive">{svc.error}</p>
                    )}
                  </div>
                  <HealthBadge status={svc.status} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Last checked: {new Date(health.data.timestamp).toLocaleString()}
              </p>
            </div>
          ) : health.error ? (
            <p className="text-sm text-destructive">{health.error}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Kafka Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Kafka Status</CardTitle>
              {kafka.data && <HealthBadge status={kafka.data.status} />}
            </div>
          </CardHeader>
          <CardContent>
            {kafka.loading ? (
              <Skeleton className="h-[80px]" />
            ) : kafka.data ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium">{kafka.data.status}</span>
                </div>
                {kafka.data.error && (
                  <p className="text-xs text-destructive">{kafka.data.error}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Checked: {new Date(kafka.data.timestamp).toLocaleString()}
                </p>
              </div>
            ) : kafka.error ? (
              <p className="text-sm text-destructive">{kafka.error}</p>
            ) : null}
          </CardContent>
        </Card>

        {/* DLQ Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dead Letter Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {dlq.loading ? (
              <Skeleton className="h-[80px]" />
            ) : dlq.data ? (
              <div className="space-y-2">
                {Object.entries(dlq.data).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium font-mono">{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : dlq.error ? (
              <p className="text-sm text-destructive">{dlq.error}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No DLQ data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Consistency Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data Consistency Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {consistency.loading ? (
            <Skeleton className="h-[100px]" />
          ) : consistency.data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(consistency.data).map(([key, val]) => (
                <div key={key} className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p className="mt-1 text-lg font-bold font-mono">{String(val)}</p>
                </div>
              ))}
            </div>
          ) : consistency.error ? (
            <p className="text-sm text-destructive">{consistency.error}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No consistency data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
