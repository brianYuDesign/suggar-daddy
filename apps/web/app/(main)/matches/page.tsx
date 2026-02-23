'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../providers/auth-provider';
import {
  Button,
  Card,
  Skeleton,
  cn,
} from '@suggar-daddy/ui';
import { Heart, MessageCircle, Users } from 'lucide-react';
import { matchingApi, usersApi, ApiError } from '../../../lib/api';

/* ---------- Local types (mirrors DTO, not imported) ---------- */

interface Match {
  id: string;
  userAId: string;
  userBId: string;
  matchedAt: Date;
  status: string;
}

interface MatchWithUser extends Match {
  otherUser?: {
    id: string;
    displayName: string;
    username?: string;
    avatarUrl?: string;
  };
}

/* ---------- Helpers ---------- */

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function formatMatchDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週前`;
  return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
}

/* ---------- Sub-components ---------- */

function MatchesSkeleton() {
  return (
    <div className="px-4 pt-6">
      <Skeleton className="mb-6 h-7 w-32" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <div className="mb-4 rounded-full bg-neutral-50 p-4">
        <Heart className="h-8 w-8 text-neutral-700" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">
        還沒有配對
      </h2>
      <p className="mt-2 max-w-xs text-sm text-gray-500">
        到探索頁面滑動卡片，找到與你互相喜歡的人吧！
      </p>
      <Button
        className="mt-4 bg-neutral-900 hover:bg-neutral-800"
        onClick={() => (window.location.href = '/discover')}
      >
        <Users className="mr-2 h-4 w-4" />
        開始探索
      </Button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <h2 className="text-lg font-semibold text-gray-900">載入失敗</h2>
      <p className="mt-2 max-w-xs text-sm text-gray-500">{message}</p>
      <Button className="mt-4" onClick={onRetry}>
        重試
      </Button>
    </div>
  );
}

/* ---------- Match card ---------- */

interface MatchCardProps {
  match: MatchWithUser;
  onClick: () => void;
}

function MatchCard({ match, onClick }: MatchCardProps) {
  const displayName = match.otherUser?.displayName ?? '未知用戶';
  const username = match.otherUser?.username;
  const avatarUrl = match.otherUser?.avatarUrl;

  return (
    <Card
      className="group cursor-pointer overflow-hidden rounded-xl border-0 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5"
      onClick={onClick}
    >
      {/* Avatar area */}
      <div className="relative h-36 bg-gradient-to-br from-neutral-100 to-neutral-200 sm:h-44">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-4xl font-bold text-neutral-700/60">
              {getInitials(displayName)}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/0 transition-all',
            'group-hover:bg-black/20'
          )}
        >
          <MessageCircle
            className={cn(
              'h-8 w-8 text-white opacity-0 transition-all',
              'group-hover:opacity-100 group-hover:scale-100 scale-75'
            )}
          />
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold text-gray-900">
          {displayName}
        </h3>
        {username && (
          <p className="truncate text-sm text-gray-500">@{username}</p>
        )}
        <p className="mt-0.5 text-xs text-gray-400">
          {formatMatchDate(match.matchedAt)}
        </p>
      </div>
    </Card>
  );
}

/* ---------- Main page ---------- */

export default function MatchesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [matches, setMatches] = useState<MatchWithUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async (cursor?: string) => {
    try {
      if (cursor) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const res = await matchingApi.getMatches(cursor);
      setNextCursor(res.nextCursor);

      // Enrich matches with user data
      const enriched: MatchWithUser[] = await Promise.all(
        res.matches.map(async (match: Match) => {
          try {
            const otherId = match.userAId === currentUser?.id ? match.userBId : match.userAId;
            const userProfile = await usersApi.getProfile(otherId);
            return {
              ...match,
              otherUser: {
                id: userProfile.id,
                displayName: userProfile.displayName,
                username: userProfile.username,
                avatarUrl: userProfile.avatarUrl,
              },
            };
          } catch {
            return { ...match };
          }
        })
      );

      setMatches((prev) => (cursor ? [...prev, ...enriched] : enriched));
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : '無法載入配對列表';
      setError(message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  /* ---------- Render ---------- */

  if (isLoading) {
    return <MatchesSkeleton />;
  }

  if (error && matches.length === 0) {
    return <ErrorState message={error} onRetry={() => fetchMatches()} />;
  }

  if (matches.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="px-4 pt-2 pb-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">配對</h1>
        <p className="text-sm text-gray-500">
          {matches.length} 位互相喜歡的人
        </p>
      </div>

      {/* Matches grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onClick={() => {
              const otherId = match.otherUser?.id;
              if (otherId && currentUser?.id) {
                const convId = [currentUser.id, otherId].sort().join('::');
                router.push(`/messages/${convId}`);
              } else {
                router.push('/messages');
              }
            }}
          />
        ))}
      </div>

      {/* Load more */}
      {nextCursor && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            className="border-neutral-200 text-neutral-900 hover:bg-neutral-50"
            onClick={() => fetchMatches(nextCursor)}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? '載入中...' : '載入更多'}
          </Button>
        </div>
      )}
    </div>
  );
}
