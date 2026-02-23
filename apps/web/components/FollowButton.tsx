'use client';

import { useState, useCallback } from 'react';
import { Button } from '@suggar-daddy/ui';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';
import { usersApi, ApiError } from '../lib/api';

interface FollowButtonProps {
  targetUserId: string;
  initialIsFollowing?: boolean;
  size?: 'sm' | 'default';
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({
  targetUserId,
  initialIsFollowing = false,
  size = 'default',
  onFollowChange,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isLoading) return;

    const previousState = isFollowing;
    // Optimistic update
    setIsFollowing(!previousState);
    onFollowChange?.(!previousState);
    setIsLoading(true);

    try {
      if (previousState) {
        await usersApi.unfollowUser(targetUserId);
      } else {
        await usersApi.followUser(targetUserId);
      }
    } catch (err) {
      // 409 = already following/unfollowed — keep the optimistic state
      if (err instanceof ApiError && err.statusCode === 409) {
        return;
      }
      // Revert on other failures
      setIsFollowing(previousState);
      onFollowChange?.(previousState);
      console.error(
        'Follow toggle failed:',
        ApiError.getMessage(err, 'Failed to update follow status')
      );
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId, isFollowing, isLoading, onFollowChange]);

  if (isFollowing) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleToggle}
        disabled={isLoading}
        className="min-w-[90px] border-neutral-200 text-neutral-900 hover:border-red-300 hover:text-red-500 hover:bg-red-50 group"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <UserCheck className="mr-1.5 h-4 w-4 group-hover:hidden" />
            <span className="group-hover:hidden">追蹤中</span>
            <span className="hidden group-hover:inline">取消追蹤</span>
          </>
        )}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className="min-w-[90px] bg-neutral-900 hover:bg-neutral-800 text-white"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <UserPlus className="mr-1.5 h-4 w-4" />
          追蹤
        </>
      )}
    </Button>
  );
}
