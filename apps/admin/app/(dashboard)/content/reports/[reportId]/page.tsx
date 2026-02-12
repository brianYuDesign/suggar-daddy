'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { ApiError } from '@suggar-daddy/api-client';
import { Card, CardHeader, CardTitle, CardContent, Badge, Skeleton, Separator, Button } from '@suggar-daddy/ui';
import { TakeDownDialog } from '@/components/take-down-dialog';

export default function ReportDetailPage() {
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
      toast.success('Post has been taken down');
      refetch();
    } catch (err) {
      toast.error(ApiError.getMessage(err, 'Failed to take down post'));
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
      toast.success('Post has been reinstated');
      refetch();
    } catch (err) {
      toast.error(ApiError.getMessage(err, 'Failed to reinstate post'));
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
    return <p className="text-muted-foreground">Report not found.</p>;
  }

  const statusVariant = report.status === 'pending' ? 'warning' : report.status === 'resolved' ? 'success' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold">Report Detail</h1>
      </div>

      {/* Report Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Report Information</CardTitle>
            <Badge variant={statusVariant}>{report.status}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Report ID</p>
              <p className="mt-1 text-sm font-mono">{report.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reporter ID</p>
              <p className="mt-1 text-sm font-mono">{report.reporterId}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reason</p>
              <p className="mt-1 text-sm">{report.reason}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reported At</p>
              <p className="mt-1 text-sm">{new Date(report.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Post Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Post Content</CardTitle>
        </CardHeader>
        <CardContent>
          {report.post ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Post ID</p>
                  <p className="mt-1 text-sm font-mono">{report.post.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Creator ID</p>
                  <p className="mt-1 text-sm font-mono">{report.post.creatorId}</p>
                </div>
              </div>
              {report.post.caption && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Caption</p>
                  <p className="mt-1 rounded-md bg-muted p-3 text-sm">{report.post.caption}</p>
                </div>
              )}
              {report.post.mediaUrls && report.post.mediaUrls.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Media</p>
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
                {report.post.likeCount !== undefined && <span>Likes: {report.post.likeCount}</span>}
                {report.post.commentCount !== undefined && <span>Comments: {report.post.commentCount}</span>}
                {report.post.visibility && <span>Visibility: {report.post.visibility}</span>}
              </div>

              <Separator />

              <div className="flex gap-3">
                {report.status === 'pending' && (
                  <Button variant="default" onClick={() => setTakeDownOpen(true)} disabled={actionLoading}>
                    Take Down Post
                  </Button>
                )}
                <Button variant="outline" onClick={handleReinstate} disabled={actionLoading}>
                  {actionLoading ? 'Processing...' : 'Reinstate Post'}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Post not found or already deleted.</p>
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
