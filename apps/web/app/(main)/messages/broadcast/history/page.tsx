'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Radio, Users, Plus } from 'lucide-react';
import { Card, CardContent, Button, Skeleton, Badge } from '@suggar-daddy/ui';
import { useAuth } from '../../../../../providers/auth-provider';
import { messagingApi, ApiError } from '../../../../../lib/api';
import { timeAgo } from '../../../../../lib/utils';

/* ------------------------------------------------------------------ */
/*  Local types                                                        */
/* ------------------------------------------------------------------ */
interface BroadcastDto {
  id: string;
  creatorId: string;
  content: string;
  audience: 'followers' | 'subscribers';
  recipientCount: number;
  createdAt: string;
  status: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function BroadcastHistoryPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [broadcasts, setBroadcasts] = useState<BroadcastDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  /* ---------- 權限檢查 ---------- */
  const isCreator =
    (user as any)?.permissionRole === 'creator' ||
    (user as any)?.userType === 'sugar_baby';

  /* ---------- 載入廣播列表 ---------- */
  useEffect(() => {
    if (!isCreator) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const result = await messagingApi.getBroadcasts();
        if (!cancelled) {
          setBroadcasts(result.data as unknown as BroadcastDto[]);
          setHasMore(result.hasMore);
          setCursor(result.cursor);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : '無法載入廣播歷史');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isCreator]);

  /* ---------- 載入更多 ---------- */
  async function handleLoadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await messagingApi.getBroadcasts(cursor);
      setBroadcasts((prev) => [...prev, ...(result.data as unknown as BroadcastDto[])]);
      setHasMore(result.hasMore);
      setCursor(result.cursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '載入更多失敗');
    } finally {
      setLoadingMore(false);
    }
  }

  /* ---------- helpers ---------- */
  function truncateContent(content: string, maxLen = 100): string {
    if (content.length <= maxLen) return content;
    return content.slice(0, maxLen) + '...';
  }

  function getAudienceLabel(audience: 'followers' | 'subscribers'): string {
    return audience === 'followers' ? '所有粉絲' : '訂閱者';
  }

  /* ---------- render: 權限不足 ---------- */
  if (!isCreator) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-4 rounded-full bg-red-50 p-4">
          <Radio className="h-8 w-8 text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">無法存取</h2>
        <p className="mt-2 max-w-xs text-sm text-gray-500">
          此功能僅限創作者使用。
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.back()}
        >
          返回
        </Button>
      </div>
    );
  }

  /* ---------- render: loading ---------- */
  if (loading) {
    return (
      <div className="space-y-3">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  /* ---------- render: error ---------- */
  if (error) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.back()}
        >
          返回
        </Button>
      </div>
    );
  }

  /* ---------- render: main ---------- */
  return (
    <div className="space-y-3">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/messages')}
            className="rounded-full p-1 transition-colors hover:bg-gray-100"
            aria-label="返回訊息列表"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">廣播歷史</h1>
        </div>
        <Button
          size="sm"
          onClick={() => router.push('/messages/broadcast')}
          className="bg-brand-500 hover:bg-brand-600"
        >
          <Plus className="mr-1 h-4 w-4" />
          新增廣播
        </Button>
      </div>

      {/* ---- Broadcast list ---- */}
      {broadcasts.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 rounded-full bg-brand-50 p-4">
            <Radio className="h-8 w-8 text-brand-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            尚未發送過廣播訊息
          </h2>
          <p className="mt-2 max-w-xs text-sm text-gray-500">
            發送廣播訊息給你的粉絲或訂閱者吧！
          </p>
          <Button
            className="mt-4 bg-brand-500 hover:bg-brand-600"
            onClick={() => router.push('/messages/broadcast')}
          >
            <Plus className="mr-1 h-4 w-4" />
            發送第一則廣播
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((broadcast) => (
            <Card
              key={broadcast.id}
              className="transition-colors hover:bg-gray-50"
            >
              <CardContent className="p-4">
                {/* Content preview */}
                <p className="text-sm text-gray-900 leading-relaxed">
                  {truncateContent(broadcast.content)}
                </p>

                {/* Meta row */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <Badge variant="secondary">
                    {getAudienceLabel(broadcast.audience)}
                  </Badge>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {broadcast.recipientCount} 人
                  </span>
                  <span>{timeAgo(broadcast.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? '載入中...' : '載入更多'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
