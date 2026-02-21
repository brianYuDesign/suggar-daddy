'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, Badge, cn } from '@suggar-daddy/ui';
import { Shield } from 'lucide-react';
import { CompatibilityBadge } from './CompatibilityBadge';
import { InterestTags } from './InterestTags';
import { SwipeActions } from './SwipeActions';
import { ProfileDetailModal } from './ProfileDetailModal';
import type { EnhancedUserCardDto } from '@suggar-daddy/dto';

interface CardModeProps {
  card: EnhancedUserCardDto;
  onSwipe: (action: 'like' | 'pass' | 'super_like') => void;
  swiping: boolean;
  onDwellTime?: (targetUserId: string, durationMs: number, photosViewed: number) => void;
}

function roleLabelMap(userType: string): string {
  const map: Record<string, string> = { sugar_daddy: 'Sugar Daddy', sugar_baby: 'Sugar Baby' };
  return map[userType] || userType;
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export function CardMode({ card, onSwipe, swiping, onDwellTime }: CardModeProps) {
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      {/* Profile card */}
      <Card
        className="w-full max-w-sm overflow-hidden rounded-2xl border-0 shadow-lg"
        data-testid="profile-card"
      >
        {/* Avatar area */}
        <button
          className="relative h-72 w-full bg-gradient-to-br from-brand-100 to-brand-200 sm:h-80"
          onClick={() => setDetailOpen(true)}
        >
          {card.avatarUrl ? (
            <img
              src={card.avatarUrl}
              alt={card.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-6xl font-bold text-brand-500/60">
                {getInitials(card.displayName)}
              </span>
            </div>
          )}

          {/* Compatibility score badge */}
          <div className="absolute top-3 right-3">
            <CompatibilityBadge score={card.compatibilityScore} size="md" />
          </div>

          {/* Boosted badge */}
          {card.isBoosted && (
            <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-xs font-bold text-white shadow">
              🚀 Boosted
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Name overlay */}
          <div className="absolute bottom-4 left-4 right-4 text-left">
            <h2 className="text-xl font-bold text-white" data-testid="profile-name">
              {card.displayName}
              {card.age && <span className="ml-2 text-lg font-normal text-white/80">{card.age}</span>}
            </h2>
            {card.username && (
              <span className="text-sm text-white/80">@{card.username}</span>
            )}
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="warning"
                className="bg-brand-500/90 text-white border-0 text-xs"
              >
                {roleLabelMap(card.userType)}
              </Badge>
              {card.verificationStatus === 'verified' && (
                <span className="flex items-center gap-0.5 text-xs text-green-300">
                  <Shield className="h-3 w-3" /> 已認證
                </span>
              )}
            </div>
          </div>
        </button>

        {/* Bio + tags section */}
        <CardContent className="p-4 space-y-3">
          {card.bio ? (
            <p className="text-sm leading-relaxed text-gray-600 line-clamp-2" data-testid="profile-bio">
              {card.bio}
            </p>
          ) : (
            <p className="text-sm italic text-gray-400" data-testid="profile-bio">
              這位用戶還沒有填寫自我介紹
            </p>
          )}

          {/* Tags preview */}
          {card.tags && card.tags.length > 0 && (
            <InterestTags tags={card.tags} maxVisible={4} size="sm" />
          )}

          {/* Common tags + distance */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {card.commonTagCount > 0 && (
              <span className="text-brand-600 font-medium">
                {card.commonTagCount} 個共同興趣
              </span>
            )}
            {card.city && (
              <span>
                📍 {card.city}
                {card.distance != null && ` · ${Math.round(card.distance)}km`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="mt-6">
        <SwipeActions
          onPass={() => onSwipe('pass')}
          onLike={() => onSwipe('like')}
          onSuperLike={() => onSwipe('super_like')}
          disabled={swiping}
        />
      </div>

      {/* Profile detail modal */}
      <ProfileDetailModal
        card={card}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onSwipe={(action) => {
          onSwipe(action);
          setDetailOpen(false);
        }}
        swiping={swiping}
        onDwellTime={onDwellTime}
      />
    </>
  );
}
