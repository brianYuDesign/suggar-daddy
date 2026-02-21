'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Skeleton,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  cn,
} from '@suggar-daddy/ui';
import { Heart, X, MessageCircle, Sparkles, Users, SlidersHorizontal } from 'lucide-react';
import { matchingApi, tagsApi, ApiError } from '../../../lib/api';
import { useAuth } from '../../../providers/auth-provider';
import { BoostButton } from '../../components/BoostButton';
import { CardMode } from './components/CardMode';
import { GridMode } from './components/GridMode';
import { MapMode } from './components/MapMode';
import { ModeSwitcher, type ViewMode } from './components/ModeSwitcher';
import { FilterDrawer } from './components/FilterDrawer';
import { UndoButton } from './components/UndoButton';
import { useFilters } from './hooks/useFilters';
import { useBehaviorTracker } from './hooks/useBehaviorTracker';
import type { EnhancedUserCardDto, InterestTagDto } from '@suggar-daddy/dto';

/* ---------- Helpers ---------- */

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
  const { filters, updateFilter, resetFilters, activeFilterCount, toQueryParams } = useFilters();
  const { trackSwipe, trackCardView, trackDetailView, trackDwell } = useBehaviorTracker();

  const [cards, setCards] = useState<EnhancedUserCardDto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [swiping, setSwiping] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'card';
    return (localStorage.getItem('discover_view_mode') as ViewMode) || 'card';
  });

  // Filter drawer
  const [filterOpen, setFilterOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<InterestTagDto[]>([]);

  // Match celebration modal
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedUser, setMatchedUser] = useState<EnhancedUserCardDto | null>(null);

  // Card view timing
  const cardViewTimeRef = useRef(Date.now());

  // Persist view mode
  useEffect(() => {
    localStorage.setItem('discover_view_mode', viewMode);
  }, [viewMode]);

  // Fetch available tags for filter
  useEffect(() => {
    tagsApi
      .getAllTags()
      .then((res) => setAvailableTags(res.tags ?? []))
      .catch(() => {});
  }, []);

  const fetchCards = useCallback(
    async (cursor?: string) => {
      try {
        setIsLoading(true);
        setError(null);
        const params = {
          ...toQueryParams(),
          cursor,
          limit: viewMode === 'grid' ? 30 : 20,
        };
        const res = await matchingApi.getCards(params);
        const newCards = res.cards as EnhancedUserCardDto[];
        setCards((prev) => (cursor ? [...prev, ...newCards] : newCards));
        setNextCursor(res.nextCursor);
        if (!cursor) setCurrentIndex(0);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : '無法載入推薦用戶';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [toQueryParams, viewMode]
  );

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  // Track card view time when card changes
  useEffect(() => {
    if (cards[currentIndex]) {
      const prev = cardViewTimeRef.current;
      const prevCard = cards[currentIndex - 1];
      if (prevCard && Date.now() - prev > 500) {
        trackCardView(prevCard.id, Date.now() - prev);
      }
      cardViewTimeRef.current = Date.now();
    }
  }, [currentIndex, cards, trackCardView]);

  const currentCard = cards[currentIndex] ?? null;

  const handleSwipe = useCallback(
    async (action: 'like' | 'pass' | 'super_like', targetUserId?: string) => {
      const target = targetUserId || currentCard?.id;
      if (!target || swiping) return;

      const durationMs = Date.now() - cardViewTimeRef.current;
      setSwiping(true);
      try {
        const res = await matchingApi.swipe({ targetUserId: target, action });
        trackSwipe(target, action, durationMs);
        setCanUndo(true);

        if (res.matched) {
          const matched = cards.find((c) => c.id === target) || currentCard;
          if (matched) {
            setMatchedUser(matched);
            setMatchModalOpen(true);
          }
        }

        // Card mode: advance index
        if (!targetUserId && viewMode === 'card') {
          const nextIndex = currentIndex + 1;
          if (nextIndex < cards.length) {
            setCurrentIndex(nextIndex);
          } else if (nextCursor) {
            await fetchCards(nextCursor);
            setCurrentIndex(nextIndex);
          } else {
            setCurrentIndex(nextIndex);
          }
        }

        // Grid/Map mode: remove card from list
        if (targetUserId) {
          setCards((prev) => prev.filter((c) => c.id !== targetUserId));
        }
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : '操作失敗，請再試一次';
        setError(message);
      } finally {
        setSwiping(false);
        cardViewTimeRef.current = Date.now();
      }
    },
    [currentCard, currentIndex, cards, nextCursor, swiping, fetchCards, trackSwipe, viewMode]
  );

  const handleUndo = useCallback(
    (card: EnhancedUserCardDto) => {
      if (viewMode === 'card') {
        setCards((prev) => {
          const newCards = [...prev];
          newCards.splice(currentIndex, 0, card);
          return newCards;
        });
        // Don't change currentIndex — the undone card is now at currentIndex
      } else {
        setCards((prev) => [card, ...prev]);
      }
      setCanUndo(false);
    },
    [currentIndex, viewMode]
  );

  const handleDwellTime = useCallback(
    (targetUserId: string, durationMs: number, photosViewed: number) => {
      trackDetailView(targetUserId, durationMs, photosViewed);
    },
    [trackDetailView]
  );

  /* ---------- Render ---------- */

  if (isLoading && cards.length === 0) {
    return <DiscoverSkeleton />;
  }

  if (error && cards.length === 0) {
    return <ErrorState message={error} onRetry={() => fetchCards()} />;
  }

  return (
    <div className="flex flex-col items-center px-4 pt-2 pb-6">
      {/* Header */}
      <div className="mb-4 flex w-full max-w-lg items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">探索</h1>
          <p className="text-sm text-gray-500">找到你感興趣的人</p>
        </div>
        <div className="flex items-center gap-2">
          <UndoButton canUndo={canUndo} onUndone={handleUndo} />
          <BoostButton />
          {/* Filter trigger */}
          <button
            onClick={() => setFilterOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
          >
            <SlidersHorizontal className="h-4 w-4 text-gray-600" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mode switcher */}
      <div className="mb-4 w-full max-w-lg flex items-center justify-between">
        <ModeSwitcher mode={viewMode} onChange={setViewMode} />
        {/* Likes Me link */}
        <button
          onClick={() => router.push('/discover/likes-me')}
          className="flex items-center gap-1.5 rounded-full bg-pink-50 px-3 py-1.5 text-xs font-medium text-pink-600 hover:bg-pink-100 transition-colors"
        >
          <Heart className="h-3.5 w-3.5" />
          誰喜歡我
        </button>
      </div>

      {/* Content area */}
      <div className="w-full max-w-lg">
        {viewMode === 'card' && (
          currentCard ? (
            <div className="flex flex-col items-center">
              <CardMode
                card={currentCard}
                onSwipe={(action) => handleSwipe(action)}
                swiping={swiping}
                onDwellTime={handleDwellTime}
              />
            </div>
          ) : (
            <EmptyState />
          )
        )}

        {viewMode === 'grid' && (
          cards.length > 0 ? (
            <GridMode
              cards={cards}
              onSwipe={(targetUserId, action) => handleSwipe(action, targetUserId)}
              swiping={swiping}
              onLoadMore={nextCursor ? () => fetchCards(nextCursor) : undefined}
              hasMore={!!nextCursor}
              onDwellTime={handleDwellTime}
            />
          ) : (
            <EmptyState />
          )
        )}

        {viewMode === 'map' && (
          cards.length > 0 ? (
            <MapMode
              cards={cards}
              onSwipe={(targetUserId, action) => handleSwipe(action, targetUserId)}
              swiping={swiping}
              onDwellTime={handleDwellTime}
            />
          ) : (
            <EmptyState />
          )
        )}
      </div>

      {/* Filter drawer */}
      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onUpdateFilter={updateFilter}
        onReset={resetFilters}
        onApply={() => fetchCards()}
        availableTags={availableTags}
      />

      {/* Match celebration modal */}
      <Dialog open={matchModalOpen} onClose={() => setMatchModalOpen(false)} data-testid="match-modal">
        <div className="flex flex-col items-center py-4 text-center">
          <div className="mb-4 rounded-full bg-brand-50 p-3">
            <Sparkles className="h-10 w-10 text-brand-500" />
          </div>
          <DialogHeader className="items-center">
            <DialogTitle className="text-center text-2xl">配對成功！</DialogTitle>
            <DialogDescription className="text-center">
              你和{' '}
              <span className="font-semibold text-brand-600">
                {matchedUser?.displayName}
              </span>{' '}
              互相喜歡對方
            </DialogDescription>
          </DialogHeader>

          {matchedUser && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-100 ring-2 ring-brand-500">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-brand-600">
                    {user?.displayName ? getInitials(user.displayName) : '?'}
                  </span>
                )}
              </div>
              <Heart className="h-5 w-5 text-brand-500" />
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-100 ring-2 ring-brand-500">
                {matchedUser.avatarUrl ? (
                  <img src={matchedUser.avatarUrl} alt={matchedUser.displayName} className="h-full w-full object-cover" />
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
            <Button variant="ghost" className="w-full" onClick={() => setMatchModalOpen(false)}>
              繼續探索
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
