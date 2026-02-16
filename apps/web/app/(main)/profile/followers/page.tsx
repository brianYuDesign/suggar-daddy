'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
} from '@suggar-daddy/ui';
import { ArrowLeft, Users } from 'lucide-react';
import { usersApi, ApiError } from '../../../../lib/api';
import { useAuth } from '../../../../providers/auth-provider';
import { FollowButton } from '../../../../components/FollowButton';
import type { UserCard } from '../../../../types/user';

export default function FollowersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [followers, setFollowers] = useState<UserCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const fetchFollowers = useCallback(
    async (nextCursor?: string) => {
      if (!user?.id) return;
      try {
        const result = await usersApi.getFollowers(user.id, nextCursor);
        setFollowers((prev) =>
          nextCursor ? [...prev, ...result.data as any] : result.data as any
        );
        setCursor(result.cursor);
        setHasMore(result.hasMore);
      } catch (err) {
        console.error(ApiError.getMessage(err, 'Failed to load followers'));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  const handleLoadMore = () => {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    fetchFollowers(cursor);
  };

  return (
    <div className="space-y-4">
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
        <h1 className="text-xl font-bold text-gray-900">我的粉絲</h1>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Follower list */}
      {!isLoading && followers.length > 0 && (
        <div className="space-y-3">
          {followers.map((follower) => {
            const initials = (follower.displayName || follower.username || 'U')
              .slice(0, 2)
              .toUpperCase();
            return (
              <Card key={follower.userId}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Link href={`/user/${follower.userId}`}>
                      <Avatar
                        src={follower.avatarUrl}
                        fallback={initials}
                        size="md"
                        className="h-12 w-12"
                      />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/user/${follower.userId}`}
                          className="text-sm font-semibold text-gray-900 truncate hover:underline"
                        >
                          {follower.displayName || follower.username}
                        </Link>
                        {follower.isVerified && (
                          <Badge
                            variant="success"
                            className="text-[10px] px-1.5 py-0"
                          >
                            已認證
                          </Badge>
                        )}
                      </div>
                      {follower.bio && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {follower.bio}
                        </p>
                      )}
                    </div>
                    <FollowButton
                      targetUserId={follower.userId || follower.id || ''}
                      size="sm"
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {hasMore && (
            <div className="flex justify-center py-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="w-full max-w-xs"
              >
                {isLoadingMore ? '載入中...' : '載入更多'}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Empty */}
      {!isLoading && followers.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">還沒有粉絲</h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            分享更多精彩內容來吸引粉絲吧！
          </p>
        </div>
      )}
    </div>
  );
}
