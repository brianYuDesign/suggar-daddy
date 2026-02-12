'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Avatar,
  Skeleton,
  Separator,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Select,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@suggar-daddy/ui';

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { data: user, loading, refetch } = useAdminQuery(
    () => adminApi.getUserDetail(userId),
    [userId],
  );
  const activity = useAdminQuery(
    () => adminApi.getUserActivity(userId),
    [userId],
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');

  const handleToggleStatus = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      if (user.isDisabled) {
        await adminApi.enableUser(userId);
        toast.success(`${user.displayName || user.email} has been enabled`);
      } else {
        await adminApi.disableUser(userId);
        toast.success(`${user.displayName || user.email} has been disabled`);
      }
      refetch();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to update user status');
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedRole) return;
    setActionLoading(true);
    try {
      await adminApi.changeUserRole(userId, selectedRole);
      toast.success(`Role changed to ${selectedRole}`);
      refetch();
    } catch (err) {
      toast.error((err as { message?: string })?.message || 'Failed to change role');
    } finally {
      setActionLoading(false);
      setRoleDialogOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  if (!user) {
    return <p className="text-muted-foreground">User not found.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold">User Detail</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar src={user.avatarUrl} fallback={user.displayName || user.email} size="lg" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">{user.displayName || 'No name'}</h2>
                <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge>
                {user.isDisabled && <Badge variant="destructive">Disabled</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.bio && <p className="text-sm">{user.bio}</p>}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRole(user.role);
                  setRoleDialogOpen(true);
                }}
              >
                Change Role
              </Button>
              <Button
                variant={user.isDisabled ? 'default' : 'outline'}
                onClick={() => setConfirmOpen(true)}
              >
                {user.isDisabled ? 'Enable User' : 'Disable User'}
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">User ID</p>
              <p className="mt-1 text-sm font-mono">{user.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Joined</p>
              <p className="mt-1 text-sm">{new Date(user.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
              <p className="mt-1 text-sm">{new Date(user.updatedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <p className="mt-1 text-sm">{user.isDisabled ? 'Disabled' : 'Active'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="posts" active={activeTab === 'posts'} onClick={() => setActiveTab('posts')}>
                Posts ({activity.data?.postCount ?? 0})
              </TabsTrigger>
              <TabsTrigger value="subscriptions" active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')}>
                Subscriptions ({activity.data?.subscriptionCount ?? 0})
              </TabsTrigger>
              <TabsTrigger value="transactions" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')}>
                Transactions ({activity.data?.transactionCount ?? 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4">
            {activity.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
              </div>
            ) : activeTab === 'posts' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Caption</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Likes</TableHead>
                    <TableHead>Comments</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.data?.posts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{p.contentType || '—'}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{p.caption || '—'}</TableCell>
                      <TableCell><Badge variant="secondary">{p.visibility || '—'}</Badge></TableCell>
                      <TableCell className="text-sm">{p.likeCount}</TableCell>
                      <TableCell className="text-sm">{p.commentCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!activity.data?.posts || activity.data.posts.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">No posts</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : activeTab === 'subscriptions' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.data?.subscriptions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-mono">{s.id.slice(0, 8)}...</TableCell>
                      <TableCell className="text-sm">
                        {s.subscriberId === userId ? 'Subscriber' : 'Creator'}
                      </TableCell>
                      <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!activity.data?.subscriptions || activity.data.subscriptions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No subscriptions</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.data?.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell><Badge variant="secondary">{t.type}</Badge></TableCell>
                      <TableCell className="text-sm font-semibold">${t.amount.toFixed(2)}</TableCell>
                      <TableCell><Badge variant={t.status === 'completed' ? 'default' : 'secondary'}>{t.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!activity.data?.transactions || activity.data.transactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">No transactions</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Enable/Disable Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogHeader>
          <DialogTitle>{user.isDisabled ? 'Enable User' : 'Disable User'}</DialogTitle>
          <DialogDescription>
            {user.isDisabled
              ? `Are you sure you want to re-enable ${user.displayName || user.email}?`
              : `Are you sure you want to disable ${user.displayName || user.email}? They will not be able to log in.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant={user.isDisabled ? 'default' : 'secondary'}
            onClick={handleToggleStatus}
            disabled={actionLoading}
          >
            {actionLoading ? 'Processing...' : user.isDisabled ? 'Enable' : 'Disable'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Change User Role</DialogTitle>
          <DialogDescription>
            Select a new role for {user.displayName || user.email}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="w-full">
            <option value="SUBSCRIBER">Subscriber</option>
            <option value="CREATOR">Creator</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button onClick={handleChangeRole} disabled={actionLoading || selectedRole === user.role}>
            {actionLoading ? 'Processing...' : 'Change Role'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
