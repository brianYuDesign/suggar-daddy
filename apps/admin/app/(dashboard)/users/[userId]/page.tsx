'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { useToast } from '@/components/toast';
import { usePermissions, AdminPermission } from '@/lib/permissions';
import { ApiError } from '@suggar-daddy/api-client';
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
  const { t } = useTranslation('users');
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const toast = useToast();
  const { hasPermission } = usePermissions();
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
        toast.success(t('dialog.enabled', { name: user.displayName || user.email }));
      } else {
        await adminApi.disableUser(userId);
        toast.success(t('dialog.disabledSuccess', { name: user.displayName || user.email }));
      }
      refetch();
    } catch (err) {
      toast.error(ApiError.getMessage(err, t('dialog.statusFailed')));
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
      toast.success(t('dialog.roleChanged', { role: selectedRole }));
      refetch();
    } catch (err) {
      toast.error(ApiError.getMessage(err, t('dialog.roleChangeFailed')));
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
    return <p className="text-muted-foreground">{t('detail.notFound')}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="text-sm text-muted-foreground hover:text-foreground">
          &larr; {t('common:actions.back')}
        </button>
        <h1 className="text-2xl font-bold">{t('detail.title')}</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <Avatar src={user.avatarUrl} fallback={user.displayName || user.email} size="lg" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold">{user.displayName || t('table.noName')}</h2>
                <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>{user.role}</Badge>
                {user.isDisabled && <Badge variant="destructive">{t('detail.disabled')}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              {user.bio && <p className="text-sm">{user.bio}</p>}
            </div>
            <div className="flex gap-2">
              {hasPermission(AdminPermission.EDIT_ALL_DATA) && (
                <Link href={`/users/${userId}/edit`}>
                  <Button variant="outline">{t('detail.editUser')}</Button>
                </Link>
              )}
              {hasPermission(AdminPermission.VIEW_CHAT_ROOMS) && (
                <Link href={`/chat-rooms?userId=${userId}`}>
                  <Button variant="outline">{t('detail.viewChats')}</Button>
                </Link>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedRole(user.role);
                  setRoleDialogOpen(true);
                }}
              >
                {t('detail.changeRole')}
              </Button>
              <Button
                variant={user.isDisabled ? 'default' : 'outline'}
                onClick={() => setConfirmOpen(true)}
              >
                {user.isDisabled ? t('detail.enableUser') : t('detail.disableUser')}
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('detail.userId')}</p>
              <p className="mt-1 text-sm font-mono">{user.id}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('detail.joined')}</p>
              <p className="mt-1 text-sm">{new Date(user.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('detail.lastUpdated')}</p>
              <p className="mt-1 text-sm">{new Date(user.updatedAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('detail.status')}</p>
              <p className="mt-1 text-sm">{user.isDisabled ? t('detail.disabled') : t('detail.active')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('detail.activity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="posts" active={activeTab === 'posts'} onClick={() => setActiveTab('posts')}>
                {t('detail.posts')} ({activity.data?.postCount ?? 0})
              </TabsTrigger>
              <TabsTrigger value="subscriptions" active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')}>
                {t('detail.subscriptions')} ({activity.data?.subscriptionCount ?? 0})
              </TabsTrigger>
              <TabsTrigger value="transactions" active={activeTab === 'transactions'} onClick={() => setActiveTab('transactions')}>
                {t('detail.transactions')} ({activity.data?.transactionCount ?? 0})
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
                    <TableHead>{t('detailTable.type')}</TableHead>
                    <TableHead>{t('detailTable.caption')}</TableHead>
                    <TableHead>{t('detailTable.visibility')}</TableHead>
                    <TableHead>{t('detailTable.likes')}</TableHead>
                    <TableHead>{t('detailTable.comments')}</TableHead>
                    <TableHead>{t('detailTable.date')}</TableHead>
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
                      <TableCell colSpan={6} className="text-center text-muted-foreground">{t('detail.noPosts')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : activeTab === 'subscriptions' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('detailTable.id')}</TableHead>
                    <TableHead>{t('detailTable.role')}</TableHead>
                    <TableHead>{t('common:table.status')}</TableHead>
                    <TableHead>{t('detailTable.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.data?.subscriptions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-mono">{s.id.slice(0, 8)}...</TableCell>
                      <TableCell className="text-sm">
                        {s.subscriberId === userId ? t('detailTable.subscriber') : t('detailTable.creator')}
                      </TableCell>
                      <TableCell><Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!activity.data?.subscriptions || activity.data.subscriptions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">{t('detail.noSubscriptions')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('detailTable.type')}</TableHead>
                    <TableHead>{t('detailTable.amount')}</TableHead>
                    <TableHead>{t('common:table.status')}</TableHead>
                    <TableHead>{t('detailTable.date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.data?.transactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell><Badge variant="secondary">{txn.type}</Badge></TableCell>
                      <TableCell className="text-sm font-semibold">${txn.amount.toFixed(2)}</TableCell>
                      <TableCell><Badge variant={txn.status === 'completed' ? 'default' : 'secondary'}>{txn.status}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(txn.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!activity.data?.transactions || activity.data.transactions.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">{t('detail.noTransactions')}</TableCell>
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
          <DialogTitle>{user.isDisabled ? t('dialog.enableTitle') : t('dialog.disableTitle')}</DialogTitle>
          <DialogDescription>
            {user.isDisabled
              ? t('dialog.enableDesc', { name: user.displayName || user.email })
              : t('dialog.disableDesc', { name: user.displayName || user.email })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={actionLoading}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant={user.isDisabled ? 'default' : 'secondary'}
            onClick={handleToggleStatus}
            disabled={actionLoading}
          >
            {actionLoading ? t('dialog.processing') : user.isDisabled ? t('detail.enableUser') : t('detail.disableUser')}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>{t('dialog.changeRoleTitle')}</DialogTitle>
          <DialogDescription>
            {t('dialog.changeRoleDesc', { name: user.displayName || user.email })}
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
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={handleChangeRole} disabled={actionLoading || selectedRole === user.role}>
            {actionLoading ? t('dialog.processing') : t('dialog.changeRoleButton')}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
