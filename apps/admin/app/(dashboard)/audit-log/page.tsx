'use client';

import { useState } from 'react';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useSort } from '@/lib/use-sort';
import { SortableTableHead } from '@/components/sortable-table-head';
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
  Input,
  Skeleton,
} from '@suggar-daddy/ui';

const methodVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'warning'> = {
  POST: 'default',
  PUT: 'warning',
  PATCH: 'warning',
  DELETE: 'destructive',
};

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [adminIdFilter, setAdminIdFilter] = useState('');
  const [adminIdInput, setAdminIdInput] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const limit = 20;

  const { data, loading } = useAdminQuery(
    () =>
      adminApi.listAuditLogs(
        page,
        limit,
        actionFilter || undefined,
        adminIdFilter || undefined,
        targetTypeFilter || undefined,
      ),
    [page, actionFilter, adminIdFilter, targetTypeFilter],
  );

  const { sorted, sort, toggleSort } = useSort(data?.data, 'createdAt');
  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Input
          placeholder="Filter by Admin ID..."
          value={adminIdInput}
          onChange={(e) => setAdminIdInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              setAdminIdFilter(adminIdInput);
              setPage(1);
            }
          }}
          className="w-64"
        />
        <Select
          value={targetTypeFilter}
          onChange={(e) => { setTargetTypeFilter(e.target.value); setPage(1); }}
          className="w-40"
        >
          <option value="">All Targets</option>
          <option value="users">Users</option>
          <option value="content">Content</option>
          <option value="reports">Reports</option>
          <option value="subscriptions">Subscriptions</option>
          <option value="withdrawals">Withdrawals</option>
          <option value="system">System</option>
        </Select>
        <Select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="w-48"
        >
          <option value="">All Actions</option>
          <option value="post.users.disable">Disable User</option>
          <option value="post.users.enable">Enable User</option>
          <option value="post.users.role">Change Role</option>
          <option value="post.content.posts.take-down">Take Down Post</option>
          <option value="post.content.posts.reinstate">Reinstate Post</option>
          <option value="post.users.batch.disable">Batch Disable</option>
          <option value="post.reports.batch.resolve">Batch Resolve</option>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Audit Logs{' '}
            {data && <span className="font-normal text-muted-foreground">({data.total} total)</span>}
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
                    <SortableTableHead label="Action" sortKey="action" sort={sort} onToggle={toggleSort} />
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead>Admin ID</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <SortableTableHead label="Date" sortKey="createdAt" sort={sort} onToggle={toggleSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm font-medium">{log.action}</TableCell>
                      <TableCell>
                        <Badge variant={methodVariant[log.method] || 'secondary'}>
                          {log.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono max-w-[200px] truncate">
                        {log.path}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {log.adminId.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {log.targetType && log.targetId
                          ? `${log.targetType}/${log.targetId.slice(0, 8)}...`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.statusCode && log.statusCode < 400 ? 'default' : 'destructive'}>
                          {log.statusCode || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {sorted?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-center">
                <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
