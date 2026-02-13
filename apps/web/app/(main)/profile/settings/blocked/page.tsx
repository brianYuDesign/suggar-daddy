'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usersApi, ApiError } from '../../../../../lib/api';
import {
  Avatar,
  Button,
  Card,
  Skeleton,
} from '@suggar-daddy/ui';
import { ArrowLeft, ShieldBan, Loader2 } from 'lucide-react';

interface BlockedUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export default function BlockedUsersPage() {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const fetchBlocked = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ids = await usersApi.getBlockedUsers();
      // Resolve user profiles
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
    fetchBlocked();
  }, [fetchBlocked]);

  const handleUnblock = async (userId: string) => {
    setUnblocking(userId);
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
          onClick={() => router.back()}
          className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          aria-label="返回"
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

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-white p-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32 flex-1" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && blockedUsers.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <ShieldBan className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">沒有封鎖的用戶</h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            你目前沒有封鎖任何人
          </p>
        </div>
      )}

      {/* Blocked users list */}
      {!loading && blockedUsers.length > 0 && (
        <div className="space-y-2">
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
                onClick={() => handleUnblock(user.id)}
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
    </div>
  );
}
