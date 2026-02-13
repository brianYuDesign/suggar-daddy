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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Creator</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          ${w.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {w.payoutMethod}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[w.status] || 'secondary'}>
                          {w.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(w.requestedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {w.status === 'pending' ? (
                          <div className="flex gap-2">
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
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {w.processedAt
                              ? new Date(w.processedAt).toLocaleDateString()
                              : '—'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data?.data.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center text-muted-foreground"
                      >
                        No withdrawal requests found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
