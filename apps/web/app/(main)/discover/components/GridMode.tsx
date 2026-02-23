'use client';

import { useState } from 'react';
import { cn } from '@suggar-daddy/ui';
import { MapPin, Shield } from 'lucide-react';
import { CompatibilityBadge } from './CompatibilityBadge';
import { ProfileDetailModal } from './ProfileDetailModal';
import type { EnhancedUserCardDto } from '@suggar-daddy/dto';

interface GridModeProps {
  cards: EnhancedUserCardDto[];
  onSwipe: (targetUserId: string, action: 'like' | 'pass' | 'super_like') => void;
  swiping: boolean;
  onLoadMore?: () => void;
  hasMore: boolean;
  onDwellTime?: (targetUserId: string, durationMs: number, photosViewed: number) => void;
}

function roleLabelMap(userType: string): string {
  const map: Record<string, string> = { sugar_daddy: 'Sugar Daddy', sugar_baby: 'Sugar Baby' };
  return map[userType] || userType;
}

export function GridMode({ cards, onSwipe, swiping, onLoadMore, hasMore, onDwellTime }: GridModeProps) {
  const [selectedCard, setSelectedCard] = useState<EnhancedUserCardDto | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => setSelectedCard(card)}
            className="group relative overflow-hidden rounded-xl bg-white shadow-sm transition-all hover:shadow-md"
          >
            {/* Avatar */}
            <div className="relative aspect-[3/4] bg-gradient-to-br from-neutral-100 to-neutral-200">
              {card.avatarUrl ? (
                <img src={card.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <span className="text-3xl font-bold text-neutral-400">
                    {card.displayName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}

              {/* Score badge */}
              <div className="absolute top-2 right-2">
                <CompatibilityBadge score={card.compatibilityScore} size="sm" />
              </div>

              {/* Boosted indicator */}
              {card.isBoosted && (
                <div className="absolute top-2 left-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  🚀
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />

              {/* Info overlay */}
              <div className="absolute bottom-2 left-2 right-2">
                <h3 className="truncate text-sm font-semibold text-white">
                  {card.displayName}
                  {card.age && <span className="font-normal opacity-80"> {card.age}</span>}
                </h3>
                <div className="flex items-center gap-1.5 text-[10px] text-white/80">
                  <span className="rounded bg-white/20 px-1 py-0.5">
                    {roleLabelMap(card.userType)}
                  </span>
                  {card.verificationStatus === 'verified' && (
                    <Shield className="h-3 w-3 text-green-300" />
                  )}
                </div>
                {card.city && (
                  <div className="mt-0.5 flex items-center gap-0.5 text-[10px] text-white/70">
                    <MapPin className="h-2.5 w-2.5" />
                    {card.city}
                    {card.distance != null && ` · ${Math.round(card.distance)}km`}
                  </div>
                )}
              </div>
            </div>

            {/* Common tags indicator */}
            {card.commonTagCount > 0 && (
              <div className="px-2 py-1.5 text-[10px] text-gold-600 font-medium">
                {card.commonTagCount} 個共同興趣
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Load more */}
      {hasMore && onLoadMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={onLoadMore}
            className="rounded-full bg-gray-100 px-6 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
          >
            載入更多
          </button>
        </div>
      )}

      {/* Profile detail modal */}
      {selectedCard && (
        <ProfileDetailModal
          card={selectedCard}
          open={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          onSwipe={(action) => {
            onSwipe(selectedCard.id, action);
            setSelectedCard(null);
          }}
          swiping={swiping}
          onDwellTime={onDwellTime}
        />
      )}
    </>
  );
}
