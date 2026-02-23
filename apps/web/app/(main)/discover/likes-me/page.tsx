'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Skeleton, cn } from '@suggar-daddy/ui';
import { Heart, ArrowLeft, Lock, Eye, Star } from 'lucide-react';
import { matchingApi, ApiError } from '../../../../lib/api';
import { DiamondPurchaseModal } from '../../../components/DiamondPurchaseModal';
import type { LikesMeCardDto } from '@suggar-daddy/dto';

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function LikesMeSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 px-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
      ))}
    </div>
  );
}

export default function LikesMePage() {
  const router = useRouter();
  const [cards, setCards] = useState<LikesMeCardDto[]>([]);
  const [count, setCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const fetchLikes = useCallback(async (cursor?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await matchingApi.getLikesMe(cursor);
      setCards((prev) => (cursor ? [...prev, ...res.cards] : res.cards));
      setCount(res.count);
      setNextCursor(res.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : '無法載入');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  const handleReveal = async (likerId: string) => {
    setRevealingId(likerId);
    try {
      const res = await matchingApi.revealLike(likerId);
      // Replace blurred card with revealed data
      setCards((prev) =>
        prev.map((c) =>
          c.id === likerId
            ? {
                ...c,
                displayName: res.card.displayName,
                avatarUrl: res.card.avatarUrl,
                isBlurred: false,
                age: res.card.age,
                city: res.card.city,
                compatibilityScore: res.card.compatibilityScore,
                userType: res.card.userType,
              }
            : c
        )
      );
    } catch (err) {
      if (err instanceof ApiError && err.message.includes('Insufficient')) {
        setShowPurchaseModal(true);
      }
    } finally {
      setRevealingId(null);
    }
  };

  const handleLikeBack = async (likerId: string) => {
    try {
      await matchingApi.swipe({ targetUserId: likerId, action: 'like' });
      // Remove from list (now matched)
      setCards((prev) => prev.filter((c) => c.id !== likerId));
      setCount((prev) => prev - 1);
    } catch {
      // ignore
    }
  };

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-3">
        <button
          onClick={() => router.push('/discover')}
          className="rounded-full p-1 hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">誰喜歡我</h1>
          <p className="text-xs text-gray-500">{count} 人喜歡你</p>
        </div>
      </div>

      {/* Subscribe CTA for free users */}
      {cards.some((c) => c.isBlurred) && (
        <div className="mx-4 mt-4 rounded-xl bg-gradient-to-r from-neutral-900 to-neutral-800 p-4 text-white">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <h3 className="font-semibold">升級查看所有喜歡你的人</h3>
          </div>
          <p className="mt-1 text-sm opacity-90">訂閱即可直接查看完整資料並立即配對</p>
          <Button
            className="mt-3 bg-white text-neutral-900 hover:bg-white/90"
            onClick={() => router.push('/subscription')}
          >
            查看方案
          </Button>
        </div>
      )}

      {/* Loading */}
      {isLoading && cards.length === 0 && (
        <div className="mt-4">
          <LikesMeSkeleton />
        </div>
      )}

      {/* Error */}
      {error && cards.length === 0 && (
        <div className="px-4 py-12 text-center">
          <p className="text-sm text-gray-500">{error}</p>
          <Button className="mt-3" onClick={() => fetchLikes()}>
            重試
          </Button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && cards.length === 0 && !error && (
        <div className="flex flex-col items-center px-4 py-16 text-center">
          <div className="mb-3 rounded-full bg-pink-50 p-4">
            <Heart className="h-8 w-8 text-pink-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">還沒有人喜歡你</h2>
          <p className="mt-1 text-sm text-gray-500">完善你的個人資料，讓更多人注意到你！</p>
        </div>
      )}

      {/* Cards grid */}
      {cards.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4 mt-4">
          {cards.map((card) => (
            <div
              key={card.id}
              className="relative overflow-hidden rounded-xl bg-white shadow-sm"
            >
              {/* Avatar */}
              <div className="relative aspect-[3/4] bg-gradient-to-br from-neutral-100 to-neutral-200">
                {card.avatarUrl ? (
                  <img
                    src={card.avatarUrl}
                    alt=""
                    className={cn(
                      'h-full w-full object-cover transition-all',
                      card.isBlurred && 'blur-xl scale-110'
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      'flex h-full items-center justify-center',
                      card.isBlurred && 'blur-xl'
                    )}
                  >
                    <span className="text-3xl font-bold text-neutral-700/40">
                      {card.displayName ? getInitials(card.displayName) : '?'}
                    </span>
                  </div>
                )}

                {/* Super like badge */}
                {card.isSuperLike && (
                  <div className="absolute top-2 left-2 flex items-center gap-0.5 rounded-full bg-violet-500 px-1.5 py-0.5">
                    <Star className="h-3 w-3 text-white" />
                    <span className="text-[10px] font-bold text-white">Super</span>
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />

                {/* Info */}
                <div className="absolute bottom-2 left-2 right-2">
                  {card.isBlurred ? (
                    <span className="text-sm font-medium text-white/80">???</span>
                  ) : (
                    <span className="truncate text-sm font-medium text-white">
                      {card.displayName}
                      {card.age && <span className="font-normal opacity-80"> {card.age}</span>}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-2">
                {card.isBlurred ? (
                  <button
                    onClick={() => handleReveal(card.id)}
                    disabled={revealingId === card.id}
                    className="flex w-full items-center justify-center gap-1 rounded-lg bg-neutral-50 py-1.5 text-xs font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-50"
                  >
                    {revealingId === card.id ? (
                      '...'
                    ) : (
                      <>
                        <Lock className="h-3 w-3" />
                        解鎖 💎20
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleLikeBack(card.id)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-neutral-900 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                    >
                      <Heart className="h-3 w-3" />
                      喜歡
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => fetchLikes(nextCursor)}
            className="rounded-full bg-gray-100 px-6 py-2 text-sm text-gray-600 hover:bg-gray-200"
          >
            載入更多
          </button>
        </div>
      )}

      <DiamondPurchaseModal
        isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        requiredAmount={20}
      />
    </div>
  );
}
