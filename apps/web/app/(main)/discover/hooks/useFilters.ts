'use client';

import { useState, useCallback, useEffect } from 'react';

export interface DiscoveryFilters {
  radius: number;
  ageMin: number;
  ageMax: number;
  userType?: 'sugar_daddy' | 'sugar_baby';
  verifiedOnly: boolean;
  onlineRecently: boolean;
  tagIds: string[];
}

const DEFAULT_FILTERS: DiscoveryFilters = {
  radius: 50,
  ageMin: 18,
  ageMax: 60,
  userType: undefined,
  verifiedOnly: false,
  onlineRecently: false,
  tagIds: [],
};

const STORAGE_KEY = 'discover_filters';

export function useFilters() {
  const [filters, setFilters] = useState<DiscoveryFilters>(() => {
    if (typeof window === 'undefined') return DEFAULT_FILTERS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...DEFAULT_FILTERS, ...JSON.parse(stored) } : DEFAULT_FILTERS;
    } catch {
      return DEFAULT_FILTERS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore
    }
  }, [filters]);

  const updateFilter = useCallback(<K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const activeFilterCount = (() => {
    let count = 0;
    if (filters.radius !== DEFAULT_FILTERS.radius) count++;
    if (filters.ageMin !== DEFAULT_FILTERS.ageMin || filters.ageMax !== DEFAULT_FILTERS.ageMax) count++;
    if (filters.userType) count++;
    if (filters.verifiedOnly) count++;
    if (filters.onlineRecently) count++;
    if (filters.tagIds.length > 0) count++;
    return count;
  })();

  const toQueryParams = useCallback(() => {
    const params: Record<string, string> = {};
    if (filters.radius !== DEFAULT_FILTERS.radius) params.radius = String(filters.radius);
    if (filters.ageMin !== DEFAULT_FILTERS.ageMin) params.ageMin = String(filters.ageMin);
    if (filters.ageMax !== DEFAULT_FILTERS.ageMax) params.ageMax = String(filters.ageMax);
    if (filters.userType) params.userType = filters.userType;
    if (filters.verifiedOnly) params.verifiedOnly = 'true';
    if (filters.onlineRecently) params.onlineRecently = 'true';
    if (filters.tagIds.length > 0) params.tags = filters.tagIds.join(',');
    return params;
  }, [filters]);

  return { filters, updateFilter, resetFilters, activeFilterCount, toQueryParams };
}
