'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { useAdminQuery } from '@/lib/hooks';
import { Card, CardHeader, CardTitle, CardContent, Badge, Avatar, Skeleton, Separator, Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button } from '@suggar-daddy/ui';

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { data: user, loading, refetch } = useAdminQuery(
    () => adminApi.getUserDetail(userId),
    [userId],
  );

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleToggleStatus = async () => {
    if (!user) return;
    setActionLoading(true);
    try {
      if (user.isDisabled) {
        await adminApi.enableUser(userId);
      } else {
        await adminApi.disableUser(userId);
      }
      refetch();
    } catch {
      // error handled by interceptor
    } finally {
      setActionLoading(false);
      setConfirmOpen(false);
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
            <Button
              variant={user.isDisabled ? 'default' : 'outline'}
              onClick={() => setConfirmOpen(true)}
            >
              {user.isDisabled ? 'Enable User' : 'Disable User'}
            </Button>
          </div>

          <Separator className="my-6" />

          <div className="grid gap-4 sm:grid-cols-2">
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

      {/* Confirm Dialog */}
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
    </div>
  );
}
