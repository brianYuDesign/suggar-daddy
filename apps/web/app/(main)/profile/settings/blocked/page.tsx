'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../../providers/auth-provider';
import { usersApi, ApiError } from '../../../../../lib/api';
import {
  Avatar,
  Button,
  Card,
  Skeleton,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@suggar-daddy/ui';
import { ArrowLeft, ShieldBan, Loader2 } from 'lucide-react';

interface BlockedUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const { isLoading: authLoading } = useAuth();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<BlockedUser | null>(null);

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = await usersApi.getBlockedUsers();
      const users = await Promise.all(
        ids.map(async (id: string) => {
          try {
            const profile = await usersApi.getProfile(id);
            return {
              id,
              displayName: profile.displayName || id.slice(0, 8),
              avatarUrl: profile.avatarUrl,
            };
          } catch {
            return { id, displayName: id.slice(0, 8) };
          }
        })
      );
      setBlockedUsers(users);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : '無法載入封鎖名單'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchBlocked();
    }
  }, [fetchBlocked, authLoading]);

  const handleUnblock = async (userId: string) => {
    setUnblocking(userId);
    setConfirmUser(null);
    try {
      await usersApi.unblockUser(userId);
      setBlockedUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : '解除封鎖失敗'
      );
    } finally {
      setUnblocking(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push('/profile/settings')}
          className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          aria-label="返回設定"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">封鎖名單</h1>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && blockedUsers.length === 0 && !error && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <ShieldBan className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            沒有封鎖的用戶
          </h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            你目前沒有封鎖任何人。被封鎖的用戶將無法查看你的內容或向你傳送訊息。
          </p>
          <Button
            variant="outline"
            className="mt-6"
            onClick={() => router.push('/profile/settings')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回設定
          </Button>
        </div>
      )}

      {/* Blocked users list */}
      {!loading && blockedUsers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 px-1">
            共 {blockedUsers.length} 位封鎖的用戶
          </p>
          {blockedUsers.map((user) => (
            <Card
              key={user.id}
              className="flex items-center gap-3 p-4"
            >
              <Avatar
                src={user.avatarUrl}
                fallback={user.displayName.slice(0, 2).toUpperCase()}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.displayName}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmUser(user)}
                disabled={unblocking === user.id}
                className="shrink-0"
              >
                {unblocking === user.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '解除封鎖'
                )}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {/* Unblock confirmation dialog */}
      <Dialog
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
      >
        <DialogHeader>
          <DialogTitle>解除封鎖</DialogTitle>
          <DialogDescription>
            確定要解除封鎖 {confirmUser?.displayName} 嗎？解除後對方將可以再次查看你的內容並傳送訊息給你。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setConfirmUser(null)}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (confirmUser) handleUnblock(confirmUser.id);
            }}
          >
            確認解除封鎖
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
