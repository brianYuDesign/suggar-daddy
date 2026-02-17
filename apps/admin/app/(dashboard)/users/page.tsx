'use client';

import { useState } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useSort } from '@/lib/use-sort';
import { useSelection } from '@/lib/use-selection';
import { useToast } from '@/components/toast';
import { SortableTableHead } from '@/components/sortable-table-head';
import { BatchActionBar } from '@/components/batch-action-bar';
import { Card, CardHeader, CardTitle, CardContent, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge, Select, Avatar, Skeleton, Input, Button, ConfirmDialog } from '@suggar-daddy/ui';
import { Pagination } from '@/components/pagination';

export default function UsersPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const limit = 20;

  const { data, loading, refetch } = useAdminQuery(
    () => adminApi.listUsers(page, limit, role || undefined, status || undefined, search || undefined),
    [page, role, status, search],
  );

  const { sorted, sort, toggleSort } = useSort(data?.data, 'createdAt');
  const selection = useSelection(data?.data);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleBatchDisable = async () => {
    if (selection.selectedCount === 0) return;
    setShowDisableConfirm(true);
  };

  const confirmBatchDisable = async () => {
    setBatchLoading(true);
    try {
      const result = await adminApi.batchDisableUsers(selection.selectedIds);
      toast.success(`已禁用 ${result.disabledCount} 位用戶`);
      selection.clear();
      refetch();
    } catch (err) {
      console.error('Batch disable failed:', err);
      toast.error('批量禁用失敗，請重試');
    } finally {
      setBatchLoading(false);
      setShowDisableConfirm(false);
    }
  };

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-64"
          />
        </div>
        <Select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="CREATOR">Creator</option>
          <option value="SUBSCRIBER">Subscriber</option>
        </Select>
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Status</option>
          <option value="disabled">Disabled</option>
        </Select>
      </div>

      {/* Batch Action Bar */}
      <BatchActionBar selectedCount={selection.selectedCount} onClear={selection.clear}>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleBatchDisable}
          disabled={batchLoading}
        >
          {batchLoading ? 'Disabling...' : 'Disable Selected'}
        </Button>
      </BatchActionBar>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            User List {data && <span className="font-normal text-muted-foreground">({data.total} total)</span>}
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
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={selection.allSelected}
                        onChange={selection.toggleAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <SortableTableHead label="Email" sortKey="email" sort={sort} onToggle={toggleSort} />
                    <SortableTableHead label="Role" sortKey="role" sort={sort} onToggle={toggleSort} />
                    <SortableTableHead label="Joined" sortKey="createdAt" sort={sort} onToggle={toggleSort} />
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selection.isSelected(user.id)}
                          onChange={() => selection.toggle(user.id)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={user.avatarUrl}
                            fallback={user.displayName || user.email}
                            size="sm"
                          />
                          <span className="font-medium">
                            {user.displayName || 'No name'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/users/${user.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          View
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sorted?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No users found
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={showDisableConfirm}
        title="確認批量禁用用戶"
        description={`您即將禁用 ${selection.selectedCount} 位用戶。禁用後，這些用戶將無法登入系統。此操作可以在用戶詳情頁面中恢復。確定要繼續嗎？`}
        confirmText="確認禁用"
        cancelText="取消"
        isDestructive={true}
        isLoading={batchLoading}
        onConfirm={confirmBatchDisable}
        onCancel={() => setShowDisableConfirm(false)}
        disableOverlayClick={batchLoading}
      />
    </div>
  );
}
