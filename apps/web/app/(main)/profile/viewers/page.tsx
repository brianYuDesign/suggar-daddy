'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
} from '@suggar-daddy/ui';
import { Eye, Crown, ArrowLeft, Users } from 'lucide-react';
import { usersApi, ApiError } from '../../../../lib/api';
import { useAuth } from '../../../../providers/auth-provider';
import { timeAgo } from '../../../../lib/utils';

interface Viewer {
  id: string;
  displayName: string;
  avatarUrl?: string;
  userType: string;
  viewedAt: number;
}

export default function ProfileViewersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [total, setTotal] = useState(0);
  const [isVip, setIsVip] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const pageSize = 20;

  const fetchViewCount = useCallback(async () => {
    try {
      const result = await usersApi.getProfileViewCount();
      setViewCount(result.count);
    } catch (err) {
      console.error(ApiError.getMessage(err, 'Failed to load view count'));
    }
  }, []);

  const fetchViewers = useCallback(
    async (pageNum: number) => {
      if (!user?.id) return;
      try {
        const result = await usersApi.getProfileViewers(pageNum, pageSize);
        setViewers((prev) =>
          pageNum === 1 ? result.viewers : [...prev, ...result.viewers]
        );
        setTotal(result.total);
        setIsVip(result.isVip);
        setHasMore(pageNum * pageSize < result.total);
      } catch (err) {
        console.error(ApiError.getMessage(err, 'Failed to load viewers'));
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    fetchViewCount();
    fetchViewers(1);
  }, [fetchViewCount, fetchViewers]);

  const handleLoadMore = () => {
    if (isLoadingMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setIsLoadingMore(true);
    fetchViewers(nextPage);
  };

  const userTypeBadge = (userType: string) => {
    switch (userType) {
      case 'sugar_daddy':
        return (
          <Badge variant="default" className="text-[10px] px-1.5 py-0">
            Sugar Daddy
          </Badge>
        );
      case 'sugar_baby':
        return (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            Sugar Baby
          </Badge>
        );
      default:
        return null;
    }
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
        <h1 className="text-xl font-bold text-gray-900">誰看過我</h1>
      </div>

      {/* View count summary */}
      {!isLoading && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-pink-100 p-2.5">
                <Eye className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500">總瀏覽次數</p>
                <p className="text-2xl font-bold text-gray-900">{viewCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="space-y-3">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
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

      {/* VIP upgrade CTA */}
      {!isLoading && !isVip && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
          <CardContent className="py-6">
            <div className="flex flex-col items-center text-center">
              <div className="mb-3 rounded-full bg-amber-100 p-3">
                <Crown className="h-6 w-6 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                升級 VIP 查看完整訪客
              </h2>
              <p className="mt-1 max-w-xs text-sm text-gray-500">
                共有 {total} 位用戶瀏覽了你的檔案，升級 VIP 即可查看他們的詳細資料
              </p>
              <Link href="/subscription">
                <Button className="mt-4 bg-amber-500 hover:bg-amber-600 text-white">
                  <Crown className="mr-2 h-4 w-4" />
                  升級 VIP
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* VIP viewer list */}
      {!isLoading && isVip && viewers.length > 0 && (
        <div className="space-y-3">
          {viewers.map((viewer) => {
            const initials = (viewer.displayName || 'U')
              .slice(0, 2)
              .toUpperCase();
            return (
              <Card
                key={viewer.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/user/${viewer.id}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={viewer.avatarUrl}
                      fallback={initials}
                      size="md"
                      className="h-12 w-12"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">
                          {viewer.displayName}
                        </span>
                        {userTypeBadge(viewer.userType)}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {timeAgo(new Date(viewer.viewedAt))}
                      </p>
                    </div>
                    <Eye className="h-4 w-4 text-gray-400 flex-shrink-0" />
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

      {/* Empty state */}
      {!isLoading && isVip && viewers.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-gray-100 p-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">還沒有人看過你</h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            完善你的個人檔案，讓更多人注意到你！
          </p>
          <Link href="/profile/edit">
            <Button className="mt-4 bg-brand-500 hover:bg-brand-600 text-white">
              編輯檔案
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
