'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { ApiError } from '@suggar-daddy/api-client';
import { StatsCard } from '@/components/stats-card';
import { Pagination } from '@/components/pagination';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Select,
  Avatar,
  Skeleton,
  Button,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Label,
  Tooltip,
  ResponsiveTable,
  type Column,
} from '@suggar-daddy/ui';
import {
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  processing: 'default',
  completed: 'default',
  rejected: 'destructive',
};

// 定義 Withdrawal 類型
interface Withdrawal {
  id: string;
  userId: string;
  amount: number;
  payoutMethod: string;
  status: string;
  requestedAt: string;
  processedAt?: string;
  user?: {
    displayName?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
}

export default function WithdrawalsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionDialog, setActionDialog] = useState<{
    id: string;
    type: 'approve' | 'reject';
    amount: number;
    userName: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const limit = 20;

  const stats = useAdminQuery(() => adminApi.getWithdrawalStats());
  const { data, loading, refetch } = useAdminQuery(
    () =>
      adminApi.listWithdrawals(
        page,
        limit,
        statusFilter || undefined,
      ),
    [page, statusFilter],
  );

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  // 定義表格列
  const columns: Column<Withdrawal>[] = [
    {
      key: 'creator',
      header: 'Creator',
      render: (w) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={w.user?.avatarUrl}
            fallback={w.user?.displayName || w.userId}
            size="sm"
          />
          <div>
            <p className="font-medium">
              {w.user?.displayName || 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground">
              {w.user?.email || w.userId}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (w) => (
        <span className="font-semibold">
          ${w.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Method',
      hideOnMobile: true,
      render: (w) => (
        <span className="text-muted-foreground">
          {w.payoutMethod}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (w) => (
        <Badge variant={statusVariant[w.status] || 'secondary'}>
          {w.status}
        </Badge>
      ),
    },
    {
      key: 'requested',
      header: 'Requested',
      hideOnMobile: true,
      render: (w) => (
        <span className="text-muted-foreground">
          {new Date(w.requestedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      hideOnMobile: true,
      render: (w) => {
        if (w.status === 'pending') {
          return (
            <div className="flex gap-2">
              <Tooltip content="批准此提款請求">
                <Button
                  size="sm"
                  onClick={() =>
                    setActionDialog({
                      id: w.id,
                      type: 'approve',
                      amount: w.amount,
                      userName: w.user?.displayName || w.userId,
                    })
                  }
                >
                  Approve
                </Button>
              </Tooltip>
              <Tooltip content="拒絕此提款請求">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setActionDialog({
                      id: w.id,
                      type: 'reject',
                      amount: w.amount,
                      userName: w.user?.displayName || w.userId,
                    })
                  }
                >
                  Reject
                </Button>
              </Tooltip>
            </div>
          );
        }
        return (
          <span className="text-xs text-muted-foreground">
            {w.processedAt
              ? new Date(w.processedAt).toLocaleDateString()
              : '—'}
          </span>
        );
      },
    },
  ];

  // 自定義移動端卡片渲染
  const renderMobileCard = (w: Withdrawal) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar
            src={w.user?.avatarUrl}
            fallback={w.user?.displayName || w.userId}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">
              {w.user?.displayName || 'Unknown'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {w.user?.email || w.userId}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-sm">${w.amount.toFixed(2)}</p>
          <Badge variant={statusVariant[w.status] || 'secondary'} className="text-[10px] mt-1">
            {w.status}
          </Badge>
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
        <span>{w.payoutMethod}</span>
        <span>{new Date(w.requestedAt).toLocaleDateString()}</span>
      </div>
      {w.status === 'pending' && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1"
            onClick={() =>
              setActionDialog({
                id: w.id,
                type: 'approve',
                amount: w.amount,
                userName: w.user?.displayName || w.userId,
              })
            }
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() =>
              setActionDialog({
                id: w.id,
                type: 'reject',
                amount: w.amount,
                userName: w.user?.displayName || w.userId,
              })
            }
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );

  const handleAction = async () => {
    if (!actionDialog) return;
    setProcessing(true);
    try {
      if (actionDialog.type === 'approve') {
        await adminApi.approveWithdrawal(actionDialog.id);
        toast.success(
          `Withdrawal $${actionDialog.amount} approved for ${actionDialog.userName}`,
        );
      } else {
        await adminApi.rejectWithdrawal(actionDialog.id, rejectReason || undefined);
        toast.success(
          `Withdrawal $${actionDialog.amount} rejected for ${actionDialog.userName}`,
        );
      }
      setActionDialog(null);
      setRejectReason('');
      refetch();
      stats.refetch();
    } catch (err) {
      toast.error(ApiError.getMessage(err, 'Failed to process withdrawal'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Withdrawals</h1>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px]" />
          ))
        ) : (
          <>
            <StatsCard
              title="Pending"
              value={stats.data?.pendingCount ?? 0}
              icon={Clock}
              description={`$${(stats.data?.pendingAmount ?? 0).toLocaleString()} total`}
            />
            <StatsCard
              title="Completed"
              value={stats.data?.completedCount ?? 0}
              icon={CheckCircle2}
              description={`$${(stats.data?.completedAmount ?? 0).toLocaleString()} paid out`}
            />
            <StatsCard
              title="Rejected"
              value={stats.data?.rejectedCount ?? 0}
              icon={XCircle}
            />
            <StatsCard
              title="Total Requests"
              value={stats.data?.totalCount ?? 0}
              icon={Wallet}
            />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-44"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Withdrawal Requests{' '}
            {data && (
              <span className="font-normal text-muted-foreground">
                ({data.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (
            <>
              <ResponsiveTable
                data={data?.data || []}
                columns={columns}
                getRowKey={(w) => w.id}
                mobileCard={renderMobileCard}
                emptyState={
                  <div className="text-center py-8 text-muted-foreground">
                    No withdrawal requests found
                  </div>
                }
              />
              <div className="mt-4 flex justify-center">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve/Reject Dialog */}
      <Dialog
        open={!!actionDialog}
        onClose={() => {
          setActionDialog(null);
          setRejectReason('');
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {actionDialog?.type === 'approve'
              ? 'Approve Withdrawal'
              : 'Reject Withdrawal'}
          </DialogTitle>
          <DialogDescription>
            {actionDialog?.type === 'approve'
              ? `Approve $${actionDialog?.amount.toFixed(2)} withdrawal for ${actionDialog?.userName}? This will process the payout.`
              : `Reject $${actionDialog?.amount.toFixed(2)} withdrawal for ${actionDialog?.userName}? The amount will be refunded to their wallet.`}
          </DialogDescription>
        </DialogHeader>

        {actionDialog?.type === 'reject' && (
          <div className="py-4">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <textarea
              id="reject-reason"
              className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Enter the reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setActionDialog(null);
              setRejectReason('');
            }}
            disabled={processing}
          >
            Cancel
          </Button>
          <Button
            variant={actionDialog?.type === 'approve' ? 'default' : 'destructive'}
            onClick={handleAction}
            disabled={processing}
          >
            {processing
              ? 'Processing...'
              : actionDialog?.type === 'approve'
                ? 'Confirm Approve'
                : 'Confirm Reject'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
