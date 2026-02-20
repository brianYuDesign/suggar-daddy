'use client';

import React from 'react';

interface FollowButtonProps {
  isFollowing: boolean;
  onToggle: () => void;
}

export default function FollowButton({ isFollowing, onToggle }: FollowButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
        isFollowing
          ? 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
          : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl'
      }`}
      aria-pressed={isFollowing}
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  );
}
