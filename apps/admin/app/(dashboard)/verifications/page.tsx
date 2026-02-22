'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { Pagination } from '@/components/pagination';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Avatar,
  Skeleton,
  Button,
  Select,
} from '@suggar-daddy/ui';
import {
  ShieldCheck,
  Clock,
  XCircle,
  CheckCircle,
  Eye,
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
  { variant: 'default' | 'secondary' | 'destructive' | 'warning'; icon: typeof Clock; label: string }
> = {
  pending: { variant: 'warning', icon: Clock, label: '待審核' },
  approved: { variant: 'default', icon: CheckCircle, label: '已通過' },
  rejected: { variant: 'destructive', icon: XCircle, label: '已拒絕' },
};

export default function VerificationsPage() {
  const _toast = useToast();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const { data, loading } = useAdminQuery(
    () => adminApi.getPendingVerifications(page, limit),
    [page, statusFilter],
  );

  const filtered = data
    ? {
        data: statusFilter
          ? data.data.filter((r: VerificationRecord) => r.status === statusFilter)
          : data.data,
        total: statusFilter
          ? data.data.filter((r: VerificationRecord) => r.status === statusFilter).length
          : data.total,
      }
    : null;

  const totalPages = filtered ? Math.ceil(filtered.total / limit) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-bold">身份認證審核</h1>
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
          <option value="">全部狀態</option>
          <option value="pending">待審核</option>
          <option value="approved">已通過</option>
          <option value="rejected">已拒絕</option>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            認證申請列表{' '}
            {filtered && (
              <span className="font-normal text-muted-foreground">
                ({filtered.total} 筆)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : !filtered?.data.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShieldCheck className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p>目前沒有認證申請</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">用戶</th>
                      <th className="pb-3 font-medium">自拍照</th>
                      <th className="pb-3 font-medium">狀態</th>
                      <th className="pb-3 font-medium">提交時間</th>
                      <th className="pb-3 font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.data.map((record: VerificationRecord) => {
                      const config = statusConfig[record.status] || statusConfig.pending;
                      const StatusIcon = config.icon;
                      return (
                        <tr key={record.id} className="hover:bg-muted/50">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={record.userAvatarUrl}
                                fallback={record.userDisplayName || record.userId}
                                size="sm"
                              />
                              <div>
                                <p className="font-medium">
                                  {record.userDisplayName || '未知用戶'}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {record.userId.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3">
                            {record.selfieUrl ? (
                              <img
                                src={record.selfieUrl}
                                alt="selfie"
                                className="h-12 w-12 rounded-md border object-cover"
                              />
                            ) : (
                              <span className="text-muted-foreground">--</span>
                            )}
                          </td>
                          <td className="py-3">
                            <Badge variant={config.variant}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
                          </td>
                          <td className="py-3 text-muted-foreground">
                            {new Date(record.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3">
                            <Link href={`/verifications/${record.userId}`}>
                              <Button size="sm" variant="outline">
                                <Eye className="mr-1 h-3.5 w-3.5" />
                                審核
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {filtered.data.map((record: VerificationRecord) => {
                  const config = statusConfig[record.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <div
                      key={record.id}
                      className="rounded-lg border p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar
                            src={record.userAvatarUrl}
                            fallback={record.userDisplayName || record.userId}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {record.userDisplayName || '未知用戶'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(record.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge variant={config.variant} className="text-[10px]">
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      {record.selfieUrl && (
                        <img
                          src={record.selfieUrl}
                          alt="selfie"
                          className="h-16 w-16 rounded-md border object-cover"
                        />
                      )}
                      <Link href={`/verifications/${record.userId}`} className="block">
                        <Button size="sm" variant="outline" className="w-full">
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          審核
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
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
    </div>
  );
}
