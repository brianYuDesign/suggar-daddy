'use client';

import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export function useSort<T>(data: T[] | undefined, defaultKey?: string, defaultDir: SortDirection = 'desc') {
  const [sort, setSort] = useState<SortState | null>(
    defaultKey ? { key: defaultKey, direction: defaultDir } : null,
  );

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const sorted = useMemo(() => {
    if (!data || !sort) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sort.key];
      const bVal = (b as Record<string, unknown>)[sort.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let cmp = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        cmp = aVal - bVal;
      } else if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = String(aVal).localeCompare(String(bVal));
      }

      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sort]);

  return { sorted, sort, toggleSort };
}
