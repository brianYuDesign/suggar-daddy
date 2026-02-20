'use client'

import React from 'react'
import Image from 'next/image'
import { RecommendationCard as RecommendationCardType } from '@/types/recommendation'
import ActionButtons from '@/components/buttons/ActionButtons'

interface RecommendationCardProps {
  card: RecommendationCardType
  isActive?: boolean
  onLike?: () => void
  onUnlike?: () => void
  onSubscribe?: () => void
  onShare?: () => void
  onComment?: () => void
}

export default function RecommendationCard({
  card,
  isActive = true,
  onLike,
  onUnlike,
  onSubscribe,
  onShare,
  onComment,
}: RecommendationCardProps) {
  const handleLike = () => {
    if (card.isLiked) {
      onUnlike?.()
    } else {
      onLike?.()
    }
  }

  return (
    <div
      className={`
        relative w-full h-full rounded-lg overflow-hidden
        bg-white shadow-lg transition-all duration-300
        ${isActive ? 'scale-100 opacity-100' : 'scale-95 opacity-50'}
      `}
      role="article"
      aria-label={`Card for ${card.creator.name}`}
    >
      {/* Thumbnail/Content Preview */}
      <div className="relative w-full h-[60%] bg-gradient-to-b from-gray-200 to-gray-300 overflow-hidden group">
        {card.content.thumbnail ? (
          <>
            <Image
              src={card.content.thumbnail}
              alt={card.content.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 400px"
            />
            {/* Content type badge */}
            <div className="absolute top-3 right-3 px-3 py-1 bg-black/40 text-white text-xs font-semibold rounded-full">
              {card.content.type.toUpperCase()}
            </div>
            {/* Duration badge for video */}
            {card.content.type === 'video' && card.content.duration && (
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 text-white text-xs font-semibold rounded">
                {Math.floor(card.content.duration / 60)}:{String(card.content.duration % 60).padStart(2, '0')}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span>{card.content.type === 'live' ? '🔴 LIVE' : '📸'}</span>
          </div>
        )}
      </div>

      {/* Content Info */}
      <div className="p-4 h-[40%] flex flex-col justify-between">
        {/* Creator Info */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative flex-shrink-0">
            <Image
              src={card.creator.avatar}
              alt={card.creator.name}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
            {card.creator.verificationStatus === 'VERIFIED' && (
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs"
                title="Verified creator"
                aria-label="This creator is verified"
              >
                ✓
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-dark truncate">
                {card.creator.name}
              </h3>
            </div>
            <p className="text-xs text-gray-500">
              {card.creator.followerCount.toLocaleString()} followers
            </p>
          </div>
        </div>

        {/* Content Title */}
        <div className="mb-3">
          <h2 className="font-bold text-sm text-dark line-clamp-2">
            {card.content.title}
          </h2>
          {card.content.category && (
            <p className="text-xs text-primary mt-1">#{card.content.category}</p>
          )}
        </div>

        {/* Subscription Info & Subscribe Button */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
          <div>
            {card.subscriptionLevel > 0 && (
              <p className="text-sm font-semibold text-primary">
                ¥{card.subscriptionPrice || 99}
              </p>
            )}
            {card.subscriptionLevel === 0 && (
              <p className="text-sm text-gray-500">Free</p>
            )}
          </div>
          <button
            onClick={onSubscribe}
            className={`
              px-4 py-1.5 rounded-full font-semibold text-xs transition-all duration-200
              ${
                card.isSubscribed
                  ? 'bg-gray-200 text-dark hover:bg-gray-300'
                  : 'bg-primary text-white hover:bg-red-600'
              }
            `}
            aria-label={
              card.isSubscribed ? `Unsubscribe from ${card.creator.name}` : `Subscribe to ${card.creator.name}`
            }
          >
            {card.isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <ActionButtons
        cardId={card.id}
        isLiked={card.isLiked}
        isSubscribed={card.isSubscribed}
        onLike={handleLike}
        onSubscribe={onSubscribe}
        onShare={onShare}
        onComment={onComment}
        likesCount={card.likes}
        subscribersCount={card.creator.followerCount}
      />
    </div>
  )
}
