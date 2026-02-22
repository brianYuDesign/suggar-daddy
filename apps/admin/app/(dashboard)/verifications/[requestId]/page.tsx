'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { ApiError } from '@suggar-daddy/api-client';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Avatar,
  Skeleton,
  Input,
} from '@suggar-daddy/ui';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface VerificationRecord {
  id: string;
  userId: string;
  selfieUrl: string;
  status: string;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  userDisplayName?: string;
  userAvatarUrl?: string;
}

const statusConfig: Record<
  string,
  { variant: 'default' | 'secondary' | 'destructive' | 'warning'; label: string }
> = {
  pending: { variant: 'warning', label: '待審核' },
  approved: { variant: 'default', label: '已通過' },
  rejected: { variant: 'destructive', label: '已拒絕' },
};

export default function VerificationDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const router = useRouter();
  const toast = useToast();

  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // requestId is the userId
  const userId = requestId;

  const { data: verifications, loading } = useAdminQuery(
    () => adminApi.getPendingVerifications(1, 100),
    [userId],
  );

  const record: VerificationRecord | undefined = verifications?.data.find(
    (v: VerificationRecord) => v.userId === userId,
  );

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await adminApi.reviewVerification(userId, 'approve');
      toast.success('認證已通過');
      router.push('/verifications');
    } catch (err) {
      toast.error(ApiError.getMessage(err, '操作失敗，請稍後再試'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('請填寫拒絕原因');
      return;
    }
    setActionLoading(true);
    try {
      await adminApi.reviewVerification(userId, 'reject', rejectReason.trim());
      toast.success('認證已拒絕');
      router.push('/verifications');
    } catch (err) {
      toast.error(ApiError.getMessage(err, '操作失敗，請稍後再試'));
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

  if (!record) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push('/verifications')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
        <p className="text-muted-foreground">找不到此認證申請</p>
      </div>
    );
  }

  const config = statusConfig[record.status] || statusConfig.pending;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/verifications')}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回列表
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">認證審核詳情</h1>
        </div>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">用戶資訊</CardTitle>
            <Badge variant={config.variant}>{config.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar
              src={record.userAvatarUrl}
              fallback={record.userDisplayName || record.userId}
              size="lg"
            />
            <div>
              <p className="text-lg font-semibold">
                {record.userDisplayName || '未知用戶'}
              </p>
              <p className="text-sm text-muted-foreground font-mono">
                {record.userId}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">申請編號</p>
              <p className="mt-1 text-sm font-mono">{record.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">提交時間</p>
              <p className="mt-1 text-sm">
                {new Date(record.createdAt).toLocaleString()}
              </p>
            </div>
            {record.reviewedAt && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">審核時間</p>
                <p className="mt-1 text-sm">
                  {new Date(record.reviewedAt).toLocaleString()}
                </p>
              </div>
            )}
            {record.reviewedBy && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">審核人員</p>
                <p className="mt-1 text-sm font-mono">{record.reviewedBy}</p>
              </div>
            )}
            {record.rejectionReason && (
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">拒絕原因</p>
                <p className="mt-1 text-sm rounded-md bg-red-50 dark:bg-red-950 p-3 text-red-800 dark:text-red-200">
                  {record.rejectionReason}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selfie Image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">自拍照片</CardTitle>
        </CardHeader>
        <CardContent>
          {record.selfieUrl ? (
            <img
              src={record.selfieUrl}
              alt="認證自拍照"
              className="max-h-96 w-auto rounded-lg border object-contain"
            />
          ) : (
            <p className="text-sm text-muted-foreground">未上傳照片</p>
          )}
        </CardContent>
      </Card>

      {/* Actions (only for pending) */}
      {record.status === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">審核操作</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showRejectForm ? (
              <div className="flex gap-3">
                <Button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  通過認證
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectForm(true)}
                  disabled={actionLoading}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  拒絕
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    拒絕原因
                  </label>
                  <textarea
                    className="mt-2 flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="請輸入拒絕此認證申請的原因..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={actionLoading || !rejectReason.trim()}
                  >
                    {actionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" />
                    )}
                    確認拒絕
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectReason('');
                    }}
                    disabled={actionLoading}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
