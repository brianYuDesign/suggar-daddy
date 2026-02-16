'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../providers/auth-provider';
import { storiesApi, ApiError } from '../../lib/api';
import { Avatar, Skeleton, cn } from '@suggar-daddy/ui';
import { Plus } from 'lucide-react';
import type { StoryGroup } from '@suggar-daddy/api-client';

interface StoriesBarProps {
  onStoryClick: (groups: StoryGroup[], startIndex: number) => void;
}

export function StoriesBar({ onStoryClick }: StoriesBarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const data = await storiesApi.getStoriesFeed();
        setGroups(data);
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : '無法載入限時動態';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStories();
  }, []);

  if (error) return null;

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden py-2">
        {/* My story skeleton */}
        <div className="flex flex-col items-center gap-1.5">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-3 w-10" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    );
  }

  const myStoryGroup = groups.find((g) => g.userId === user?.id);
  const otherGroups = groups.filter((g) => g.userId !== user?.id);

  const handleStoryClick = (groupIndex: number) => {
    const allGroups = myStoryGroup
      ? [myStoryGroup, ...otherGroups]
      : otherGroups;
    onStoryClick(allGroups, groupIndex);
  };

  return (
    <div
      ref={scrollRef}
      className="flex gap-3 overflow-x-auto py-2 scrollbar-hide"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {/* My Story */}
      <button
        className="flex flex-col items-center gap-1.5 shrink-0"
        onClick={() => {
          if (myStoryGroup && myStoryGroup.stories.length > 0) {
            handleStoryClick(0);
          } else {
            router.push('/story/create');
          }
        }}
      >
        <div className="relative">
          <div
            className={cn(
              'rounded-full p-[2px]',
              myStoryGroup?.hasUnviewed
                ? 'bg-gradient-to-tr from-brand-500 to-pink-500'
                : 'bg-gray-200'
            )}
          >
            <div className="rounded-full bg-white p-[2px]">
              <Avatar
                src={user?.avatarUrl}
                fallback={user?.displayName?.slice(0, 2) || '??'}
                size="lg"
              />
            </div>
          </div>
          {/* Plus icon overlay */}
          <div className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand-500 text-white">
            <Plus className="h-3.5 w-3.5" />
          </div>
        </div>
        <span className="w-16 truncate text-center text-[10px] text-gray-600">
          我的動態
        </span>
      </button>

      {/* Other users' stories */}
      {otherGroups.map((group, idx) => {
        const groupIndex = myStoryGroup ? idx + 1 : idx;
        return (
          <button
            key={group.userId}
            className="flex flex-col items-center gap-1.5 shrink-0"
            onClick={() => handleStoryClick(groupIndex)}
          >
            <div
              className={cn(
                'rounded-full p-[2px]',
                group.hasUnviewed
                  ? 'bg-gradient-to-tr from-brand-500 to-pink-500'
                  : 'bg-gray-300'
              )}
            >
              <div className="rounded-full bg-white p-[2px]">
                <Avatar
                  src={group.avatarUrl}
                  fallback={group.username.slice(0, 2)}
                  size="lg"
                />
              </div>
            </div>
            <span className="w-16 truncate text-center text-[10px] text-gray-600">
              {group.username}
            </span>
          </button>
        );
      })}
    </div>
  );
}
