'use client';

import { useState, useCallback, useMemo } from 'react';

export function useSelection<T extends { id: string }>(items: T[] | undefined) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (!items) return;
    setSelectedIds((prev) => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map((i) => i.id));
    });
  }, [items]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const allSelected = useMemo(
    () => !!items && items.length > 0 && selectedIds.size === items.length,
    [items, selectedIds],
  );

  const selectedCount = selectedIds.size;
  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);

  return {
    selectedIds: selectedArray,
    selectedCount,
    isSelected,
    toggle,
    toggleAll,
    allSelected,
    clear,
  };
}
