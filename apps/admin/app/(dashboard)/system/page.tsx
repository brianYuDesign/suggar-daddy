'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import type { DlqMessage } from '@suggar-daddy/api-client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@suggar-daddy/ui';
import { HealthBadge } from '@/components/health-badge';

export default function SystemPage() {
  const { t } = useTranslation('system');
  const toast = useToast();
  const health = useAdminQuery(() => adminApi.getSystemHealth());
  const kafka = useAdminQuery(() => adminApi.getKafkaStatus());
  const dlq = useAdminQuery(() => adminApi.getDlqStats());
  const consistency = useAdminQuery(() => adminApi.getConsistencyMetrics());

  const [dlqMessages, setDlqMessages] = useState<DlqMessage[]>([]);
  const [dlqLoading, setDlqLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ action: 'retryAll' | 'purge' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDlqMessages = async () => {
    setDlqLoading(true);
    try {
      const res = await adminApi.getDlqMessages();
      setDlqMessages(res.messages || []);
    } catch (err) {
      console.error('Failed to fetch DLQ messages:', err);
      setDlqMessages([]);
    } finally {
      setDlqLoading(false);
    }
  };

  useEffect(() => {
    fetchDlqMessages();
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      health.refetch();
      kafka.refetch();
      dlq.refetch();
      consistency.refetch();
      fetchDlqMessages();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (messageId: string) => {
    try {
      await adminApi.retryDlqMessage(messageId);
      toast.success(t('toast.retrySuccess'));
      fetchDlqMessages();
      dlq.refetch();
    } catch (err) {
      console.error('Failed to retry message:', err);
      toast.error(t('toast.retryFailed'));
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      await adminApi.deleteDlqMessage(messageId);
      toast.success(t('toast.deleteSuccess'));
      fetchDlqMessages();
      dlq.refetch();
    } catch (err) {
      console.error('Failed to delete message:', err);
      toast.error(t('toast.deleteFailed'));
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    setActionLoading(true);
    try {
      if (confirmDialog.action === 'retryAll') {
        await adminApi.retryAllDlqMessages();
        toast.success(t('toast.retryAllSuccess'));
      } else {
        await adminApi.purgeDlqMessages();
        toast.success(t('toast.purgeSuccess'));
      }
      fetchDlqMessages();
      dlq.refetch();
    } catch (err) {
      console.error('DLQ operation failed:', err);
      toast.error(t('toast.operationFailed'));
    } finally {
      setActionLoading(false);
      setConfirmDialog(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <button
          onClick={() => {
            health.refetch();
            kafka.refetch();
            dlq.refetch();
            consistency.refetch();
            fetchDlqMessages();
          }}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          {t('refresh')}
        </button>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('systemHealth')}</CardTitle>
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
                      <p className="text-xs text-muted-foreground">{t('latency', { ms: svc.latencyMs })}</p>
                    )}
                    {svc.error && (
                      <p className="text-xs text-destructive">{svc.error}</p>
                    )}
                  </div>
                  <HealthBadge status={svc.status} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                {t('lastChecked', { time: new Date(health.data.timestamp).toLocaleString() })}
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
              <CardTitle className="text-base">{t('kafkaStatus')}</CardTitle>
              {kafka.data && <HealthBadge status={kafka.data.status} />}
            </div>
          </CardHeader>
          <CardContent>
            {kafka.loading ? (
              <Skeleton className="h-[80px]" />
            ) : kafka.data ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('status')}</span>
                  <span className="font-medium">{kafka.data.status}</span>
                </div>
                {kafka.data.error && (
                  <p className="text-xs text-destructive">{kafka.data.error}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('checked', { time: new Date(kafka.data.timestamp).toLocaleString() })}
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
            <CardTitle className="text-base">{t('dlq')}</CardTitle>
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
              <p className="text-sm text-muted-foreground">{t('noDlqData')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DLQ Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('dlqMessages')}</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog({ action: 'retryAll' })}
                disabled={dlqMessages.length === 0}
              >
                {t('retryAll')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog({ action: 'purge' })}
                disabled={dlqMessages.length === 0}
              >
                {t('purgeAll')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {dlqLoading ? (
            <Skeleton className="h-[100px]" />
          ) : dlqMessages.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dlqTable.id')}</TableHead>
                  <TableHead>{t('dlqTable.topic')}</TableHead>
                  <TableHead>{t('dlqTable.error')}</TableHead>
                  <TableHead>{t('dlqTable.retries')}</TableHead>
                  <TableHead>{t('dlqTable.date')}</TableHead>
                  <TableHead>{t('dlqTable.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dlqMessages.map((msg) => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-mono text-xs">{msg.id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{msg.topic}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {msg.error}
                    </TableCell>
                    <TableCell className="text-sm">{msg.retryCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleRetry(msg.id)}>
                          {t('dlqTable.retry')}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(msg.id)}>
                          {t('dlqTable.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noDlqMessages')}</p>
          )}
        </CardContent>
      </Card>

      {/* Consistency Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('consistency')}</CardTitle>
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
            <p className="text-sm text-muted-foreground">{t('noConsistencyData')}</p>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
        <DialogHeader>
          <DialogTitle>
            {confirmDialog?.action === 'retryAll' ? t('dialog.retryAllTitle') : t('dialog.purgeTitle')}
          </DialogTitle>
          <DialogDescription>
            {confirmDialog?.action === 'retryAll'
              ? t('dialog.retryAllDesc')
              : t('dialog.purgeDesc')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={actionLoading}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant={confirmDialog?.action === 'purge' ? 'destructive' : 'default'}
            onClick={handleConfirmAction}
            disabled={actionLoading}
          >
            {actionLoading ? t('common:status.processing') : t('common:actions.confirm')}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
