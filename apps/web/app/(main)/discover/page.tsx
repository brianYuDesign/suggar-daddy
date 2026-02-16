'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Skeleton,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn,
} from '@suggar-daddy/ui';
import { Heart, X, Star, MessageCircle, Sparkles, Users } from 'lucide-react';
import { matchingApi, ApiError } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import type { UserCard } from '../../../types/user';

/* ---------- Local types ---------- */

interface SwipeResponse {
  matched: boolean;
  matchId?: string;
}

/* ---------- Helpers ---------- */

function roleLabelMap(userType: string): string {
  const map: Record<string, string> = {
    sugar_daddy: 'Sugar Daddy',
    sugar_baby: 'Sugar Baby',
  };
  return map[userType] || userType;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/* ---------- Sub-components ---------- */

function DiscoverSkeleton() {
  return (
    <div className="flex flex-col items-center px-4 pt-6">
      <div className="w-full max-w-sm">
        <Skeleton className="h-[480px] w-full rounded-2xl" />
        <div className="mt-6 flex items-center justify-center gap-6">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-14 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <div className="mb-4 rounded-full bg-brand-50 p-4">
        <Users className="h-8 w-8 text-brand-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900" data-testid="no-more-profiles">
        目前沒有更多推薦
      </h2>
      <p className="mt-2 max-w-xs text-sm text-gray-500">
        你已經看完所有推薦的人了，稍後再回來看看吧！
      </p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center px-4 py-20 text-center">
      <div className="mb-4 rounded-full bg-red-50 p-4">
        <X className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900" data-testid="error-state">載入失敗</h2>
      <p className="mt-2 max-w-xs text-sm text-gray-500">{message}</p>
      <Button className="mt-4" onClick={onRetry}>
        重試
      </Button>
    </div>
  );
}

/* ---------- Main page ---------- */

export default function DiscoverPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [cards, setCards] = useState<UserCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swiping, setSwiping] = useState(false);

  // Match celebration modal
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedUser, setMatchedUser] = useState<UserCard | null>(null);

  const fetchCards = useCallback(async (cursor?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await matchingApi.getCards(cursor);
      setCards((prev) => (cursor ? [...prev, ...res.cards as any] : res.cards as any));
      setNextCursor(res.nextCursor);
      if (!cursor) setCurrentIndex(0);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : '無法載入推薦用戶';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const currentCard = cards[currentIndex] ?? null;

  const handleSwipe = useCallback(
    async (action: 'like' | 'pass' | 'super_like') => {
      if (!currentCard || swiping) return;

      setSwiping(true);
      try {
        const res: SwipeResponse = await matchingApi.swipe({
          targetUserId: currentCard.id!,
          action,
        });

        if (res.matched) {
          setMatchedUser(currentCard);
          setMatchModalOpen(true);
        }

        // Advance to next card
        const nextIndex = currentIndex + 1;
        if (nextIndex < cards.length) {
          setCurrentIndex(nextIndex);
        } else if (nextCursor) {
          // Fetch more cards
          await fetchCards(nextCursor);
          setCurrentIndex(nextIndex);
        } else {
          // No more cards
          setCurrentIndex(nextIndex);
        }
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : '操作失敗，請再試一次';
        setError(message);
      } finally {
        setSwiping(false);
      }
    },
    [currentCard, currentIndex, cards.length, nextCursor, swiping, fetchCards]
  );

  /* ---------- Render ---------- */

  if (isLoading && cards.length === 0) {
    return <DiscoverSkeleton />;
  }

  if (error && cards.length === 0) {
    return <ErrorState message={error} onRetry={() => fetchCards()} />;
  }

  if (!currentCard) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col items-center px-4 pt-2 pb-6">
      {/* Page title */}
      <div className="mb-4 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900">探索</h1>
        <p className="text-sm text-gray-500">找到你感興趣的人</p>
      </div>

      {/* Profile card */}
      <Card className="w-full max-w-sm overflow-hidden rounded-2xl border-0 shadow-lg" data-testid="profile-card">
        {/* Avatar area */}
        <div className="relative h-72 bg-gradient-to-br from-brand-100 to-brand-200 sm:h-80">
          {currentCard.avatarUrl ? (
            <img
              src={currentCard.avatarUrl}
              alt={currentCard.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-6xl font-bold text-brand-500/60">
                {getInitials(currentCard.displayName)}
              </span>
            </div>
          )}

          {/* Gradient overlay at bottom for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Name overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-xl font-bold text-white" data-testid="profile-name">
              {currentCard.displayName}
            </h2>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="warning"
                className="bg-brand-500/90 text-white border-0 text-xs"
              >
                {roleLabelMap(currentCard.userType)}
              </Badge>
              {currentCard.verificationStatus === 'verified' && (
                <Badge variant="success" className="text-xs">
                  已認證
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Bio section */}
        <CardContent className="p-4">
          {currentCard.bio ? (
            <p className="text-sm leading-relaxed text-gray-600" data-testid="profile-bio">
              {currentCard.bio}
            </p>
          ) : (
            <p className="text-sm italic text-gray-400" data-testid="profile-bio">
              這位用戶還沒有填寫自我介紹
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="mt-6 flex items-center justify-center gap-5">
        {/* Pass */}
        <button
          onClick={() => handleSwipe('pass')}
          disabled={swiping}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-200 bg-white shadow-md transition-all',
            'hover:scale-105 hover:border-gray-300 hover:shadow-lg',
            'active:scale-95',
            'disabled:opacity-50 disabled:hover:scale-100'
          )}
          aria-label="跳過"
          data-action="pass"
        >
          <X className="h-6 w-6 text-gray-400" />
        </button>

        {/* Super Like */}
        <button
          onClick={() => handleSwipe('super_like')}
          disabled={swiping}
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-300 bg-white shadow-md transition-all',
            'hover:scale-105 hover:border-yellow-400 hover:shadow-lg',
            'active:scale-95',
            'disabled:opacity-50 disabled:hover:scale-100'
          )}
          aria-label="超級喜歡"
          data-action="super-like"
        >
          <Star className="h-5 w-5 text-yellow-500" />
        </button>

        {/* Like */}
        <button
          onClick={() => handleSwipe('like')}
          disabled={swiping}
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-brand-500/30 transition-all',
            'hover:scale-105 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/40',
            'active:scale-95',
            'disabled:opacity-50 disabled:hover:scale-100'
          )}
          aria-label="喜歡"
          data-action="like"
        >
          <Heart className="h-7 w-7 text-white" />
        </button>
      </div>

      {/* Match celebration modal */}
      <Dialog open={matchModalOpen} onClose={() => setMatchModalOpen(false)} data-testid="match-modal">
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 rounded-full bg-brand-50 p-3">
            <Sparkles className="h-10 w-10 text-brand-500" />
          </div>
          <DialogHeader className="items-center">
            <DialogTitle className="text-center text-2xl">
              配對成功！
            </DialogTitle>
            <DialogDescription className="text-center">
              你和{' '}
              <span className="font-semibold text-brand-600">
                {matchedUser?.displayName}
              </span>{' '}
              互相喜歡對方
            </DialogDescription>
          </DialogHeader>

          {/* Matched user mini-avatar */}
          {matchedUser && (
            <div className="mt-4 flex items-center gap-3">
              {/* Current user avatar */}
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-100 ring-2 ring-brand-500">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-brand-600">
                    {user?.displayName
                      ? getInitials(user.displayName)
                      : '?'}
                  </span>
                )}
              </div>

              <Heart className="h-5 w-5 text-brand-500" />

              {/* Matched user avatar */}
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-100 ring-2 ring-brand-500">
                {matchedUser.avatarUrl ? (
                  <img
                    src={matchedUser.avatarUrl}
                    alt={matchedUser.displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-brand-600">
                    {getInitials(matchedUser.displayName)}
                  </span>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="mt-6 w-full flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-brand-500 hover:bg-brand-600"
              onClick={() => {
                setMatchModalOpen(false);
                if (matchedUser && user?.id) {
                  const convId = [user.id, matchedUser.id].sort().join('::');
                  router.push(`/messages/${convId}`);
                } else {
                  router.push('/messages');
                }
              }}
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              發送訊息
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setMatchModalOpen(false)}
            >
              繼續探索
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
