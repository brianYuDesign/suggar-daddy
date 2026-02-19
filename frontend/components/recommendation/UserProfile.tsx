'use client'

import React from 'react'
import Image from 'next/image'
import { Creator } from '@/types/recommendation'

interface UserProfileProps {
  creator: Creator
  isSubscribed?: boolean
  onSubscribe?: () => void
  contentCount?: number
  totalEarnings?: number
}

export default function UserProfile({
  creator,
  isSubscribed = false,
  onSubscribe,
  contentCount = 0,
  totalEarnings = 0,
}: UserProfileProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 max-w-md w-full"
      role="article"
      aria-label={`Profile for ${creator.name}`}
    >
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <Image
            src={creator.avatar}
            alt={creator.name}
            width={100}
            height={100}
            className="rounded-full object-cover"
          />
          {creator.verificationStatus && (
            <div
              className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg"
              title={`${creator.verificationStatus} creator`}
              aria-label="Creator verification badge"
            >
              ✓
            </div>
          )}
        </div>

        {/* Name & Status */}
        <h2 className="text-2xl font-bold text-dark">{creator.name}</h2>
        {creator.verificationStatus && (
          <p className="text-sm text-primary font-semibold mt-1">
            {creator.verificationStatus}
          </p>
        )}
      </div>

      {/* Bio */}
      {creator.bio && (
        <p className="text-gray-600 text-center text-sm mb-6 line-clamp-2">
          {creator.bio}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 py-4 border-t border-b border-gray-200">
        <div className="text-center">
          <p className="text-2xl font-bold text-dark">
            {(creator.followerCount / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-gray-500 mt-1">Followers</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-dark">{contentCount}</p>
          <p className="text-xs text-gray-500 mt-1">Posts</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-dark">
            {totalEarnings ? (totalEarnings / 1000).toFixed(1) + 'K' : '0'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Earnings</p>
        </div>
      </div>

      {/* Subscribe Button */}
      <button
        onClick={onSubscribe}
        className={`
          w-full py-3 rounded-lg font-semibold transition-all duration-200
          ${
            isSubscribed
              ? 'bg-gray-200 text-dark hover:bg-gray-300'
              : 'bg-primary text-white hover:bg-red-600'
          }
        `}
        aria-label={
          isSubscribed ? `Unsubscribe from ${creator.name}` : `Subscribe to ${creator.name}`
        }
      >
        {isSubscribed ? '✓ Subscribed' : 'Subscribe'}
      </button>
    </div>
  )
}
