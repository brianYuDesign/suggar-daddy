'use client';

import { useState } from 'react';
import { cn } from '@suggar-daddy/ui';
import { MapPin } from 'lucide-react';
import { CompatibilityBadge } from './CompatibilityBadge';
import { ProfileDetailModal } from './ProfileDetailModal';
import type { EnhancedUserCardDto } from '@suggar-daddy/dto';

interface MapModeProps {
  cards: EnhancedUserCardDto[];
  onSwipe: (targetUserId: string, action: 'like' | 'pass' | 'super_like') => void;
  swiping: boolean;
  onDwellTime?: (targetUserId: string, durationMs: number, photosViewed: number) => void;
}

/**
 * Map mode placeholder — requires Mapbox GL JS integration.
 * For now, renders a visual grid with location emphasis.
 * TODO: Replace with react-map-gl when Mapbox API key is configured.
 */
export function MapMode({ cards, onSwipe, swiping, onDwellTime }: MapModeProps) {
  const [selectedCard, setSelectedCard] = useState<EnhancedUserCardDto | null>(null);

  // Filter cards with location data
  const cardsWithLocation = cards.filter((c) => c.city || c.distance != null);

  if (cardsWithLocation.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="mb-3 rounded-full bg-gray-100 p-3">
          <MapPin className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="text-sm font-medium text-gray-700">沒有可用的位置資訊</h3>
        <p className="mt-1 text-xs text-gray-500">附近沒有用戶開啟位置功能</p>
      </div>
    );
  }

  return (
    <>
      {/* Map placeholder — visual representation */}
      <div className="relative rounded-2xl bg-gradient-to-br from-blue-50 to-green-50 p-4 border border-gray-200">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-medium text-gray-700">附近的人 ({cardsWithLocation.length})</span>
        </div>

        {/* Simulated map grid sorted by distance */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {cardsWithLocation.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelectedCard(card)}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-white p-2 shadow-sm transition-all hover:shadow-md"
            >
              {/* Avatar */}
              <div className="relative h-14 w-14 overflow-hidden rounded-full ring-2 ring-brand-200">
                {card.avatarUrl ? (
                  <img src={card.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-100">
                    <span className="text-sm font-bold text-brand-500">
                      {card.displayName.slice(0, 1)}
                    </span>
                  </div>
                )}
                {card.isBoosted && (
                  <div className="absolute -top-0.5 -right-0.5 text-[10px]">🚀</div>
                )}
              </div>

              {/* Name */}
              <span className="w-full truncate text-center text-xs font-medium text-gray-700">
                {card.displayName}
              </span>

              {/* Distance */}
              {card.distance != null && (
                <span className="text-[10px] text-gray-400">
                  {Math.round(card.distance)}km
                </span>
              )}

              {/* Score */}
              <CompatibilityBadge score={card.compatibilityScore} size="sm" />
            </button>
          ))}
        </div>

        {/* Map integration hint */}
        <div className="mt-3 rounded-lg bg-blue-50 p-2 text-center text-xs text-blue-600">
          🗺️ 完整地圖模式即將推出（需要 Mapbox API）
        </div>
      </div>

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
