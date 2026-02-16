'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../../providers/auth-provider';
import { storiesApi } from '../../lib/api';
import { Avatar } from '@suggar-daddy/ui';
import { X, ChevronLeft, ChevronRight, Eye, Trash2 } from 'lucide-react';
import { timeAgo } from '../../lib/utils';
import type { StoryGroup, StoryViewer as StoryViewerType } from '@suggar-daddy/api-client';

interface StoryViewerProps {
  groups: StoryGroup[];
  startGroupIndex: number;
  onClose: () => void;
}

const STORY_DURATION = 5000;

export function StoryViewer({ groups, startGroupIndex, onClose }: StoryViewerProps) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [viewers, setViewers] = useState<StoryViewerType[]>([]);
  const [showViewers, setShowViewers] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const goNextRef = useRef<() => void>(() => {});

  const currentGroup = groups[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const isOwnStory = currentGroup?.userId === user?.id;

  const goNext = useCallback(() => {
    if (!currentGroup) return;
    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((prev) => prev + 1);
      setStoryIndex(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [currentGroup, storyIndex, groupIndex, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else if (groupIndex > 0) {
      setGroupIndex((prev) => prev - 1);
      const prevGroup = groups[groupIndex - 1];
      setStoryIndex(prevGroup ? prevGroup.stories.length - 1 : 0);
      setProgress(0);
    }
  }, [storyIndex, groupIndex, groups]);

  // Keep ref current
  goNextRef.current = goNext;

  // Mark story as viewed
  useEffect(() => {
    if (!currentStory || isOwnStory) return;
    if (!currentStory.isViewed) {
      storiesApi.markStoryAsViewed(currentStory.storyId).catch(() => {});
    }
  }, [currentStory, isOwnStory]);

  // Progress timer
  useEffect(() => {
    if (!currentStory || isPaused) return;

    const duration = currentStory.mediaType === 'VIDEO'
      ? (currentStory.duration || 15) * 1000
      : STORY_DURATION;
    const interval = 50;
    let elapsed = 0;

    setProgress(0);

    timerRef.current = setInterval(() => {
      elapsed += interval;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (elapsed >= duration) {
        clearInterval(timerRef.current);
        goNextRef.current();
      }
    }, interval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [groupIndex, storyIndex, isPaused, currentStory]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goPrev();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev, onClose]);

  // Touch handling
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    }
    setIsPaused(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsPaused(false);
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const dy = touch.clientY - touchStartRef.current.y;
    const dx = touch.clientX - touchStartRef.current.x;
    touchStartRef.current = null;

    if (dy > 100 && Math.abs(dx) < 50) {
      onClose();
      return;
    }

    if (Math.abs(dy) < 30 && Math.abs(dx) < 30) {
      const screenWidth = window.innerWidth;
      if (touch.clientX < screenWidth / 3) {
        goPrev();
      } else {
        goNext();
      }
    }
  };

  const handleShowViewers = async () => {
    if (!currentStory || !isOwnStory) return;
    setShowViewers(true);
    setIsPaused(true);
    try {
      const data = await storiesApi.getStoryViewers(currentStory.storyId);
      setViewers(data);
    } catch {
      setViewers([]);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory) return;
    try {
      await storiesApi.deleteStory(currentStory.storyId);
      if (currentGroup && currentGroup.stories.length <= 1) {
        if (groupIndex < groups.length - 1) {
          setGroupIndex((prev) => prev + 1);
          setStoryIndex(0);
        } else {
          onClose();
        }
      } else {
        goNext();
      }
    } catch {
      // ignore
    }
  };

  if (!currentGroup || !currentStory) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      <div
        className="relative flex h-full w-full items-center justify-center"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
      >
        {/* Progress bars */}
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-2">
          {currentGroup.stories.map((_, idx) => (
            <div key={idx} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white transition-all duration-100"
                style={{
                  width:
                    idx < storyIndex
                      ? '100%'
                      : idx === storyIndex
                        ? `${progress}%`
                        : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4 pt-3">
          <div className="flex items-center gap-3">
            <Avatar
              src={currentGroup.avatarUrl}
              fallback={currentGroup.username.slice(0, 2)}
              size="sm"
              className="border border-white/50"
            />
            <div>
              <p className="text-sm font-semibold text-white">
                {currentGroup.username}
              </p>
              <p className="text-[10px] text-white/70">
                {timeAgo(currentStory.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isOwnStory && (
              <button
                onClick={handleDeleteStory}
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/20"
                aria-label="刪除限時動態"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/20"
              aria-label="關閉"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Click zones (desktop) */}
        <button
          className="absolute left-0 top-0 bottom-0 z-10 w-1/3 cursor-pointer"
          onClick={goPrev}
          aria-label="上一則"
        />
        <button
          className="absolute right-0 top-0 bottom-0 z-10 w-1/3 cursor-pointer"
          onClick={goNext}
          aria-label="下一則"
        />

        {/* Navigation arrows (desktop) */}
        {(storyIndex > 0 || groupIndex > 0) && (
          <button
            onClick={goPrev}
            className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30 md:flex"
            aria-label="上一則"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {(storyIndex < currentGroup.stories.length - 1 ||
          groupIndex < groups.length - 1) && (
          <button
            onClick={goNext}
            className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/20 p-2 text-white backdrop-blur-sm hover:bg-white/30 md:flex"
            aria-label="下一則"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Media */}
        <div className="h-full w-full">
          {currentStory.mediaType === 'VIDEO' ? (
            <video
              key={currentStory.storyId}
              src={currentStory.mediaUrl}
              className="h-full w-full object-contain"
              autoPlay
              playsInline
              muted={false}
            />
          ) : (
            <img
              key={currentStory.storyId}
              src={currentStory.mediaUrl}
              alt="Story"
              className="h-full w-full object-contain"
            />
          )}
        </div>

        {/* Bottom: viewers count */}
        {isOwnStory && (
          <button
            className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-white backdrop-blur-sm"
            onClick={handleShowViewers}
          >
            <Eye className="h-4 w-4" />
            <span className="text-sm">{currentStory.viewsCount} 次觀看</span>
          </button>
        )}
      </div>

      {/* Viewers modal */}
      {showViewers && (
        <div className="absolute inset-0 z-30 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => {
              setShowViewers(false);
              setIsPaused(false);
            }}
          />
          <div className="relative w-full max-w-lg rounded-t-2xl bg-white px-4 pb-8 pt-4 max-h-[60vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">
                觀看者 ({viewers.length})
              </h3>
              <button
                onClick={() => {
                  setShowViewers(false);
                  setIsPaused(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {viewers.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                還沒有人觀看
              </p>
            ) : (
              <div className="space-y-3">
                {viewers.map((viewer) => (
                  <div key={viewer.userId} className="flex items-center gap-3">
                    <Avatar
                      src={viewer.avatarUrl}
                      fallback={viewer.username.slice(0, 2)}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {viewer.username}
                      </p>
                      <p className="text-xs text-gray-400">
                        {timeAgo(viewer.viewedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
