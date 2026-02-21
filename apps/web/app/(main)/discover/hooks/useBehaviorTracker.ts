'use client';

import { useRef, useCallback, useEffect } from 'react';
import { matchingApi } from '../../../../lib/api';
import type { BehaviorEventDto, SwipeAction } from '@suggar-daddy/dto';

const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_BATCH_SIZE = 10;

export function useBehaviorTracker() {
  const bufferRef = useRef<BehaviorEventDto[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flush = useCallback(async () => {
    if (bufferRef.current.length === 0) return;
    const batch = bufferRef.current.splice(0);
    try {
      await matchingApi.sendBehaviorEvents(batch);
    } catch {
      // Re-queue on failure (drop if buffer too large)
      if (bufferRef.current.length < 200) {
        bufferRef.current.unshift(...batch);
      }
    }
  }, []);

  const push = useCallback(
    (event: BehaviorEventDto) => {
      bufferRef.current.push(event);
      if (bufferRef.current.length >= FLUSH_BATCH_SIZE) {
        flush();
      }
    },
    [flush]
  );

  useEffect(() => {
    flushTimerRef.current = setInterval(flush, FLUSH_INTERVAL_MS);
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      flush(); // flush remaining on unmount
    };
  }, [flush]);

  const trackSwipe = useCallback(
    (targetUserId: string, action: SwipeAction, durationMs: number) => {
      push({
        eventType: 'swipe',
        targetUserId,
        metadata: { action, durationMs },
        timestamp: Date.now(),
      });
    },
    [push]
  );

  const trackCardView = useCallback(
    (targetUserId: string, durationMs: number) => {
      push({
        eventType: 'view_card',
        targetUserId,
        metadata: { durationMs },
        timestamp: Date.now(),
      });
    },
    [push]
  );

  const trackDetailView = useCallback(
    (targetUserId: string, durationMs: number, photosViewed: number) => {
      push({
        eventType: 'view_detail',
        targetUserId,
        metadata: { durationMs, photosViewed },
        timestamp: Date.now(),
      });
    },
    [push]
  );

  const trackDwell = useCallback(
    (targetUserId: string, durationMs: number, context: 'card' | 'detail') => {
      push({
        eventType: context === 'card' ? 'dwell_card' : 'dwell_detail',
        targetUserId,
        metadata: { durationMs },
        timestamp: Date.now(),
      });
    },
    [push]
  );

  return { trackSwipe, trackCardView, trackDetailView, trackDwell };
}
