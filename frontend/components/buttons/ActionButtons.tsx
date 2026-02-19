'use client'

import React from 'react'
import { ActionButtonsProps } from '@/types/recommendation'

export default function ActionButtons({
  cardId,
  isLiked = false,
  isSubscribed = false,
  onLike,
  onSubscribe,
  onShare,
  onComment,
  likesCount = 0,
  subscribersCount = 0,
}: ActionButtonsProps) {
  return (
    <div
      className="absolute bottom-4 left-4 right-4 flex gap-2 flex-wrap"
      role="group"
      aria-label="Action buttons"
    >
      {/* Like Button */}
      <button
        onClick={onLike}
        className={`
          flex items-center gap-1 px-3 py-2 rounded-full font-medium text-sm
          transition-all duration-200 transform hover:scale-110
          ${
            isLiked
              ? 'bg-red-50 text-primary'
              : 'bg-white/80 text-gray-600 hover:bg-white'
          }
        `}
        aria-label={isLiked ? 'Unlike' : 'Like'}
        title={`${likesCount} likes`}
      >
        <span className={isLiked ? 'text-lg' : 'text-lg'}>❤️</span>
        <span className="hidden sm:inline">{likesCount > 0 ? likesCount : ''}</span>
      </button>

      {/* Comment Button */}
      <button
        onClick={onComment}
        className="
          flex items-center gap-1 px-3 py-2 rounded-full font-medium text-sm
          bg-white/80 text-gray-600 hover:bg-white
          transition-all duration-200 transform hover:scale-110
        "
        aria-label="Comment"
      >
        <span className="text-lg">💬</span>
        <span className="hidden sm:inline"></span>
      </button>

      {/* Share Button */}
      <button
        onClick={onShare}
        className="
          flex items-center gap-1 px-3 py-2 rounded-full font-medium text-sm
          bg-white/80 text-gray-600 hover:bg-white
          transition-all duration-200 transform hover:scale-110
        "
        aria-label="Share"
      >
        <span className="text-lg">📤</span>
        <span className="hidden sm:inline"></span>
      </button>

      {/* Subscribe Button (Compact) */}
      {!isSubscribed && (
        <button
          onClick={onSubscribe}
          className="
            flex items-center gap-1 px-3 py-2 rounded-full font-medium text-sm
            bg-primary/20 text-primary hover:bg-primary/30
            transition-all duration-200 transform hover:scale-110
          "
          aria-label="Subscribe"
          title="Subscribe to support this creator"
        >
          <span>⭐</span>
          <span className="hidden sm:inline">Subscribe</span>
        </button>
      )}
    </div>
  )
}
