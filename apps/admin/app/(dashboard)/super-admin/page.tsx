'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { usePermissions, AdminPermission } from '@/lib/permissions';
import { useToast } from '@/components/toast';
import { Card, CardHeader, CardTitle, CardContent, Badge, Avatar, Skeleton, Button, ConfirmDialog } from '@suggar-daddy/ui';

export default function SuperAdminPage() {
  const { t } = useTranslation('superadmin');
  const { requirePermission } = usePermissions();
  requirePermission(AdminPermission.MANAGE_ADMINS);

  const toast = useToast();
  const [demoteTarget, setDemoteTarget] = useState<{ id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: admins, loading: adminsLoading, refetch: refetchAdmins } = useAdminQuery(
    () => adminApi.listAdmins(),
    [],
  );

  const { data: overview, loading: overviewLoading } = useAdminQuery(
    () => adminApi.getPermissionOverview(),
    [],
  );

  const handleDemote = async () => {
    if (!demoteTarget) return;
    setActionLoading(true);
    try {
      const result = await adminApi.demoteAdmin(demoteTarget.id);
      toast.success(result.message);
      refetchAdmins();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to demote admin');
    } finally {
      setActionLoading(false);
      setDemoteTarget(null);
    }
  };

  const handleForcePasswordReset = async (userId: string, name: string) => {
    try {
      const result = await adminApi.forcePasswordReset(userId);
      toast.success(result.message);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to force password reset');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Badge variant="destructive">{t('superAdminOnly')}</Badge>
      </div>

      {/* Permission Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('permissionOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <Skeleton className="h-20" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-2xl font-bold">{overview?.totalUsers ?? 0}</div>
                <p className="text-sm text-muted-foreground">{t('totalUsers')}</p>
              </div>
              {overview?.roleDistribution &&
                Object.entries(overview.roleDistribution).map(([role, count]) => (
                  <div key={role}>
                    <div className="text-2xl font-bold">{count}</div>
                    <p className="text-sm text-muted-foreground">{role}</p>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t('adminAccounts')} {admins && <span className="font-normal text-muted-foreground">({admins.length} total)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {adminsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <div className="divide-y">
              {admins?.map((admin) => (
                <div key={admin.id} className="flex items-center gap-4 py-4">
                  <Avatar
                    src={admin.avatarUrl}
                    fallback={admin.displayName || admin.email}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{admin.displayName}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                  <Badge
                    variant={admin.permissionRole === 'super_admin' ? 'destructive' : 'default'}
                  >
                    {admin.permissionRole}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {admin.lastActiveAt
                      ? t('actions.lastActive', { date: new Date(admin.lastActiveAt).toLocaleDateString() })
                      : t('actions.neverActive')}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleForcePasswordReset(admin.id, admin.displayName)}
                    >
                      {t('actions.resetPassword')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDemoteTarget({ id: admin.id, name: admin.displayName })}
                    >
                      {t('actions.demote')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('recentActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">{t('table.action')}</th>
                    <th className="pb-2 font-medium">{t('table.adminId')}</th>
                    <th className="pb-2 font-medium">{t('table.target')}</th>
                    <th className="pb-2 font-medium">{t('table.method')}</th>
                    <th className="pb-2 font-medium">{t('table.status')}</th>
                    <th className="pb-2 font-medium">{t('table.time')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {overview?.recentAdminActions?.map((action) => (
                    <tr key={action.id}>
                      <td className="py-2">{action.action}</td>
                      <td className="py-2 text-xs text-muted-foreground">{action.adminId?.slice(0, 8)}...</td>
                      <td className="py-2">
                        {action.targetType && (
                          <Badge variant="outline" className="text-xs">
                            {action.targetType}:{action.targetId?.slice(0, 8)}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2">
                        <Badge variant="secondary" className="text-xs">{action.method}</Badge>
                      </td>
                      <td className="py-2">{action.statusCode}</td>
                      <td className="py-2 text-xs text-muted-foreground">
                        {new Date(action.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demote Confirm Dialog */}
      <ConfirmDialog
        open={!!demoteTarget}
        title={t('dialog.demoteTitle')}
        description={t('dialog.demoteDesc', { name: demoteTarget?.name })}
        confirmText={t('dialog.confirmDemote')}
        cancelText={t('common:actions.cancel')}
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={handleDemote}
        onCancel={() => setDemoteTarget(null)}
        disableOverlayClick={actionLoading}
      />
    </div>
  );
}
