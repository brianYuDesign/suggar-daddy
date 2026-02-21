'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { ApiError } from '@suggar-daddy/api-client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton, Separator, Button } from '@suggar-daddy/ui';
import { TakeDownDialog } from '@/components/take-down-dialog';

export default function ReportDetailPage() {
  const { t } = useTranslation('content');
  const { reportId } = useParams<{ reportId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: report, loading, refetch } = useAdminQuery(
    () => adminApi.getReportDetail(reportId),
    [reportId],
  );

  const [takeDownOpen, setTakeDownOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleTakeDown = async (reason: string) => {
    if (!report?.post) return;
    setActionLoading(true);
    try {
      await adminApi.takeDownPost(report.post.id, reason);
      toast.success(t('reportDetail.takenDownSuccess'));
      refetch();
    } catch (err) {
      toast.error(ApiError.getMessage(err, t('reportDetail.takeDownFailed')));
    } finally {
      setActionLoading(false);
      setTakeDownOpen(false);
    }
  };

  const handleReinstate = async () => {
    if (!report?.post) return;
    setActionLoading(true);
    try {
      await adminApi.reinstatePost(report.post.id);
      toast.success(t('reportDetail.reinstatedSuccess'));
      refetch();
    } catch (err) {
      toast.error(ApiError.getMessage(err, t('reportDetail.reinstateFailed')));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (!report) {
    return <p className="text-muted-foreground">{t('reportDetail.notFound')}</p>;
  }

  const statusVariant = report.status === 'pending' ? 'warning' : report.status === 'resolved' ? 'success' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">
          &larr; {t('common:actions.back')}
        </button>
        <h1 className="text-2xl font-bold">{t('reportDetail.title')}</h1>
      </div>

      {/* Report Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('reportDetail.reportInfo')}</CardTitle>
            <Badge variant={statusVariant}>{report.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('reportDetail.reportId')}</p>
              <p className="mt-1 text-sm font-mono">{report.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('reportDetail.reporterId')}</p>
              <p className="mt-1 text-sm font-mono">{report.reporterId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('reportDetail.reason')}</p>
              <p className="mt-1 text-sm">{report.reason}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('reportDetail.reportedAt')}</p>
              <p className="mt-1 text-sm">{new Date(report.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Post Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('reportDetail.postContent')}</CardTitle>
        </CardHeader>
        <CardContent>
          {report.post ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('reportDetail.postId')}</p>
                  <p className="mt-1 text-sm font-mono">{report.post.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('reportDetail.creatorId')}</p>
                  <p className="mt-1 text-sm font-mono">{report.post.creatorId}</p>
                </div>
              </div>
              {report.post.caption && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('reportDetail.caption')}</p>
                  <p className="mt-1 rounded-md bg-muted p-3 text-sm">{report.post.caption}</p>
                </div>
              )}
              {report.post.mediaUrls && report.post.mediaUrls.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('reportDetail.media')}</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {report.post.mediaUrls.map((url, idx) => {
                      const isVideo = /\.(mp4|webm|mov)$/i.test(url);
                      return isVideo ? (
                        <video
                          key={idx}
                          src={url}
                          controls
                          className="aspect-square w-full rounded-md border object-cover"
                        />
                      ) : (
                        <img
                          key={idx}
                          src={url}
                          alt={`Media ${idx + 1}`}
                          className="aspect-square w-full rounded-md border object-cover"
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="flex gap-4 text-sm text-muted-foreground">
                {report.post.likeCount !== undefined && <span>{t('reportDetail.likes', { count: report.post.likeCount })}</span>}
                {report.post.commentCount !== undefined && <span>{t('reportDetail.comments', { count: report.post.commentCount })}</span>}
                {report.post.visibility && <span>Visibility: {report.post.visibility}</span>}
              </div>

              <Separator />

              <div className="flex gap-3">
                {report.status === 'pending' && (
                  <Button variant="default" onClick={() => setTakeDownOpen(true)} disabled={actionLoading}>
                    {t('reportDetail.takeDown')}
                  </Button>
                )}
                <Button variant="outline" onClick={handleReinstate} disabled={actionLoading}>
                  {actionLoading ? t('dialog.processing', { ns: 'users' }) : t('reportDetail.reinstate')}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('reportDetail.postNotFound')}</p>
          )}
        </CardContent>
      </Card>

      <TakeDownDialog
        open={takeDownOpen}
        onClose={() => setTakeDownOpen(false)}
        onConfirm={handleTakeDown}
        loading={actionLoading}
      />
    </div>
  );
}
