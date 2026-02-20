'use client';

import { useState, useEffect, useCallback } from 'react';
import { contentApi, ApiError } from '../lib/api';

const STORAGE_KEY = 'likedPosts';

function loadFromStorage(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

function saveToStorage(liked: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...liked]));
  } catch { /* ignore quota errors */ }
}

/**
 * Shared hook for managing liked posts state with localStorage persistence.
 * Since the backend has no `isLiked` field or batch check endpoint,
 * we persist liked state in localStorage and handle 409 (already liked/unliked)
 * as confirmation of the current state.
 */
export function useLikedPosts() {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(loadFromStorage);

  // Persist to localStorage on every change
  useEffect(() => {
    saveToStorage(likedPosts);
  }, [likedPosts]);

  const isLiked = useCallback(
    (postId: string) => likedPosts.has(postId),
    [likedPosts]
  );

  const toggleLike = useCallback(
    async (postId: string): Promise<{ success: boolean; isLiked: boolean }> => {
      const wasLiked = likedPosts.has(postId);

      // Optimistic update
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (wasLiked) {
          next.delete(postId);
        } else {
          next.add(postId);
        }
        return next;
      });

      try {
        if (wasLiked) {
          await contentApi.unlikePost(postId);
        } else {
          await contentApi.likePost(postId);
        }
        return { success: true, isLiked: !wasLiked };
      } catch (err) {
        // 409 = already liked/unliked — the server state confirms our optimistic update
        if (err instanceof ApiError && err.statusCode === 409) {
          return { success: true, isLiked: !wasLiked };
        }
        // Other error: revert optimistic update
        setLikedPosts((prev) => {
          const next = new Set(prev);
          if (wasLiked) {
            next.add(postId);
          } else {
            next.delete(postId);
          }
          return next;
        });
        throw err;
      }
    },
    [likedPosts]
  );

  return { likedPosts, isLiked, toggleLike };
}
