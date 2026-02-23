'use client';

import { useState, useEffect, useRef } from 'react';
import { Button, cn } from '@suggar-daddy/ui';
import { X, ChevronLeft, ChevronRight, MapPin, Clock, Shield } from 'lucide-react';
import { matchingApi } from '../../../../lib/api';
import { CompatibilityBadge } from './CompatibilityBadge';
import { InterestTags } from './InterestTags';
import { SwipeActions } from './SwipeActions';
import type { CardDetailResponseDto, EnhancedUserCardDto } from '@suggar-daddy/dto';

interface ProfileDetailModalProps {
  card: EnhancedUserCardDto;
  open: boolean;
  onClose: () => void;
  onSwipe: (action: 'like' | 'pass' | 'super_like') => void;
  swiping: boolean;
  onDwellTime?: (targetUserId: string, durationMs: number, photosViewed: number) => void;
}

function roleLabelMap(userType: string): string {
  const map: Record<string, string> = {
    sugar_daddy: 'Sugar Daddy',
    sugar_baby: 'Sugar Baby',
  };
  return map[userType] || userType;
}

export function ProfileDetailModal({
  card,
  open,
  onClose,
  onSwipe,
  swiping,
  onDwellTime,
}: ProfileDetailModalProps) {
  const [detail, setDetail] = useState<CardDetailResponseDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const openTimeRef = useRef(Date.now());
  const photosViewedRef = useRef(1);

  useEffect(() => {
    if (!open) return;
    openTimeRef.current = Date.now();
    photosViewedRef.current = 1;
    setPhotoIndex(0);
    setLoading(true);
    matchingApi
      .getCardDetail(card.id)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => {
      if (onDwellTime) {
        const dwell = Date.now() - openTimeRef.current;
        onDwellTime(card.id, dwell, photosViewedRef.current);
      }
    };
  }, [open, card.id, onDwellTime]);

  if (!open) return null;

  const photos = detail?.photos?.length ? detail.photos : card.avatarUrl ? [card.avatarUrl] : [];
  const currentPhoto = photos[photoIndex];

  const prevPhoto = () => {
    setPhotoIndex((i) => Math.max(0, i - 1));
  };
  const nextPhoto = () => {
    const next = Math.min(photos.length - 1, photoIndex + 1);
    if (next > photosViewedRef.current - 1) photosViewedRef.current = next + 1;
    setPhotoIndex(next);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-x-2 top-4 bottom-4 z-50 mx-auto max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl md:inset-x-auto md:w-[440px]">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Photo gallery */}
        <div className="relative h-80 bg-gradient-to-br from-neutral-100 to-neutral-200">
          {currentPhoto ? (
            <img src={currentPhoto} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <span className="text-6xl font-bold text-neutral-400">
                {card.displayName.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}

          {/* Photo navigation */}
          {photos.length > 1 && (
            <>
              {photoIndex > 0 && (
                <button
                  onClick={prevPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1 text-white"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {photoIndex < photos.length - 1 && (
                <button
                  onClick={nextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1 text-white"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {photos.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-1.5 rounded-full transition-all',
                      i === photoIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        {/* Info section */}
        <div className="px-4 py-4 space-y-4">
          {/* Name + score */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {card.displayName}
                {card.age && <span className="ml-2 text-lg font-normal text-gray-500">{card.age}</span>}
              </h2>
              {card.username && (
                <span className="text-sm text-gray-500">@{card.username}</span>
              )}
              <div className="mt-1 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800">
                  {roleLabelMap(card.userType)}
                </span>
                {card.verificationStatus === 'verified' && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
                    <Shield className="h-3 w-3" /> 已認證
                  </span>
                )}
              </div>
            </div>
            <CompatibilityBadge score={card.compatibilityScore} size="lg" showLabel />
          </div>

          {/* Location + active */}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {card.city && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {card.city}
                {card.distance != null && <span>· {Math.round(card.distance)}km</span>}
              </span>
            )}
            {card.lastActiveAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                最近上線
              </span>
            )}
          </div>

          {/* Bio */}
          {card.bio && (
            <p className="text-sm leading-relaxed text-gray-600">{card.bio}</p>
          )}

          {/* Score breakdown */}
          {detail?.scoreBreakdown && (
            <div className="rounded-xl bg-gray-50 p-3 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">相容度分析</h3>
              {[
                { label: '類型互補', value: detail.scoreBreakdown.userTypeMatch, max: 30 },
                { label: '距離', value: detail.scoreBreakdown.distanceScore, max: 20 },
                { label: '年齡', value: detail.scoreBreakdown.ageScore, max: 15 },
                { label: '興趣匹配', value: detail.scoreBreakdown.tagScore, max: 20 },
                { label: '行為分析', value: detail.scoreBreakdown.behaviorScore, max: 15 },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="w-16 text-xs text-gray-500">{item.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-gold-400 transition-all"
                      style={{ width: `${(item.value / item.max) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs font-medium text-gray-600">
                    {item.value}/{item.max}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {detail?.tags && detail.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">
                興趣標籤
                {detail.commonTagCount > 0 && (
                  <span className="ml-1 text-gold-500">({detail.commonTagCount} 個共同)</span>
                )}
              </h3>
              <InterestTags tags={detail.tags} maxVisible={20} />
            </div>
          )}

          {/* Recent posts */}
          {detail?.recentPosts && detail.recentPosts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase">最近動態</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {detail.recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="min-w-[200px] rounded-xl border bg-white p-3 shadow-sm"
                  >
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt=""
                        className="mb-2 h-24 w-full rounded-lg object-cover"
                      />
                    )}
                    <p className="line-clamp-2 text-xs text-gray-600">{post.content}</p>
                    <div className="mt-1 flex gap-3 text-xs text-gray-400">
                      <span>❤️ {post.likeCount}</span>
                      <span>💬 {post.commentCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed bottom actions */}
        <div className="sticky bottom-0 border-t bg-white px-4 py-3">
          <SwipeActions
            onPass={() => { onSwipe('pass'); onClose(); }}
            onLike={() => { onSwipe('like'); onClose(); }}
            onSuperLike={() => { onSwipe('super_like'); onClose(); }}
            disabled={swiping}
          />
        </div>
      </div>
    </>
  );
}
