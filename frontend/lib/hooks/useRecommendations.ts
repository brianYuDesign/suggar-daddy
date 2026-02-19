import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  fetchRecommendations,
  rateContent,
  recordInteraction,
  subscribeCreator,
  unsubscribeCreator,
  setFilter,
  GetRecommendationsRequest,
} from '@/lib/api';

/**
 * Custom hook for recommendations
 * Manages fetching and interacting with recommendations
 */
export const useRecommendations = () => {
  const dispatch = useAppDispatch();
  const recommendations = useAppSelector((state) => state.recommendations);

  // Fetch recommendations
  const fetchRecs = useCallback(
    async (params: GetRecommendationsRequest) => {
      const result = await dispatch(fetchRecommendations(params));
      return result.payload;
    },
    [dispatch]
  );

  // Load more recommendations
  const loadMore = useCallback(async () => {
    const nextOffset = (recommendations.pagination.page - 1) * recommendations.pagination.limit + recommendations.pagination.limit;
    const result = await dispatch(
      fetchRecommendations({
        ...recommendations.filters,
        offset: nextOffset,
      })
    );
    return result.payload;
  }, [dispatch, recommendations]);

  // Rate content
  const rate = useCallback(
    async (contentId: string, rating: number, userId: string) => {
      await dispatch(
        rateContent({
          userId,
          contentId,
          rating,
        })
      );
    },
    [dispatch]
  );

  // Record interaction
  const recordUserInteraction = useCallback(
    async (
      contentId: string,
      type: 'view' | 'like' | 'share' | 'comment' | 'skip',
      userId: string
    ) => {
      await dispatch(
        recordInteraction({
          userId,
          contentId,
          interactionType: type,
        })
      );
    },
    [dispatch]
  );

  // Subscribe to creator
  const subscribe = useCallback(
    async (creatorId: string) => {
      await dispatch(subscribeCreator(creatorId));
    },
    [dispatch]
  );

  // Unsubscribe from creator
  const unsubscribe = useCallback(
    async (creatorId: string) => {
      await dispatch(unsubscribeCreator(creatorId));
    },
    [dispatch]
  );

  // Update filters
  const updateFilters = useCallback(
    (filters: Partial<GetRecommendationsRequest>) => {
      dispatch(setFilter(filters));
    },
    [dispatch]
  );

  return {
    // State
    items: recommendations.items,
    loading: recommendations.loading,
    error: recommendations.error,
    pagination: recommendations.pagination,
    filters: recommendations.filters,

    // Methods
    fetch: fetchRecs,
    loadMore,
    rate,
    recordInteraction: recordUserInteraction,
    subscribe,
    unsubscribe,
    updateFilters,
  };
};

export default useRecommendations;
