import { useCallback } from 'react';
import { useAppSelector } from './redux';
import {
  recommendationsApi,
  GetRecommendationsRequest,
} from '@/lib/api';

/**
 * Custom hook for recommendations
 * Manages fetching and interacting with recommendations
 */
export const useRecommendations = () => {
  const recommendations = useAppSelector((state) => state.recommendations);

  // Fetch recommendations
  const fetchRecs = useCallback(
    async (params: GetRecommendationsRequest) => {
      const result = await recommendationsApi.getRecommendations(params);
      return result;
    },
    []
  );

  // Load more recommendations
  const loadMore = useCallback(async () => {
    const nextOffset = (recommendations.pagination.page - 1) * recommendations.pagination.limit + recommendations.pagination.limit;
    const result = await recommendationsApi.getRecommendations({
      ...recommendations.filters,
      offset: nextOffset,
    });
    return result;
  }, [recommendations]);

  // Rate content
  const rate = useCallback(
    async (contentId: string, rating: number, userId: string) => {
      await recommendationsApi.rateContent({
        userId,
        contentId,
        rating,
      });
    },
    []
  );

  // Record interaction
  const recordUserInteraction = useCallback(
    async (
      contentId: string,
      type: 'view' | 'like' | 'share' | 'comment' | 'skip',
      userId: string
    ) => {
      await recommendationsApi.recordInteraction({
        userId,
        contentId,
        interactionType: type,
      });
    },
    []
  );

  // Subscribe to creator
  const subscribe = useCallback(
    async (creatorId: string) => {
      // API call for subscription
      console.log('Subscribe to creator:', creatorId);
    },
    []
  );

  // Unsubscribe from creator
  const unsubscribe = useCallback(
    async (creatorId: string) => {
      // API call for unsubscription
      console.log('Unsubscribe from creator:', creatorId);
    },
    []
  );

  // Update filters
  const updateFilters = useCallback(
    (filters: Partial<GetRecommendationsRequest>) => {
      // Update filters in state
      console.log('Update filters:', filters);
    },
    []
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
