'use client';

import { cn } from '@suggar-daddy/ui';
import type { InterestTagDto } from '@suggar-daddy/dto';

interface InterestTagsProps {
  tags: InterestTagDto[];
  maxVisible?: number;
  size?: 'sm' | 'md';
}

export function InterestTags({ tags, maxVisible = 6, size = 'md' }: InterestTagsProps) {
  const visible = tags.slice(0, maxVisible);
  const remaining = tags.length - maxVisible;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((tag) => (
        <span
          key={tag.id}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium',
            size === 'sm' ? 'text-xs' : 'text-sm',
            tag.isCommon
              ? 'border-brand-300 bg-brand-50 text-brand-700'
              : 'border-gray-200 bg-gray-50 text-gray-600'
          )}
        >
          {tag.icon && <span className="text-xs">{tag.icon}</span>}
          {tag.nameZh || tag.name}
        </span>
      ))}
      {remaining > 0 && (
        <span
          className={cn(
            'inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-gray-400',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}
