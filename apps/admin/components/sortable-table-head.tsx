'use client';

import { TableHead } from '@suggar-daddy/ui';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { SortState } from '@/lib/use-sort';

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  sort: SortState | null;
  onToggle: (key: string) => void;
  className?: string;
}

export function SortableTableHead({ label, sortKey, sort, onToggle, className }: SortableTableHeadProps) {
  const isActive = sort?.key === sortKey;

  return (
    <TableHead className={className}>
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground"
        onClick={() => onToggle(sortKey)}
      >
        {label}
        {isActive ? (
          sort.direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
