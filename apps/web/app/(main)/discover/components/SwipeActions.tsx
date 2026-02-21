'use client';

import { cn } from '@suggar-daddy/ui';
import { Heart, X, Star } from 'lucide-react';

interface SwipeActionsProps {
  onPass: () => void;
  onLike: () => void;
  onSuperLike: () => void;
  disabled: boolean;
}

export function SwipeActions({ onPass, onLike, onSuperLike, disabled }: SwipeActionsProps) {
  return (
    <div className="flex items-center justify-center gap-5">
      {/* Pass */}
      <button
        onClick={onPass}
        disabled={disabled}
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-full border-2 border-gray-200 bg-white shadow-md transition-all',
          'hover:scale-105 hover:border-gray-300 hover:shadow-lg',
          'active:scale-95',
          'disabled:opacity-50 disabled:hover:scale-100'
        )}
        aria-label="跳過"
        data-action="pass"
      >
        <X className="h-6 w-6 text-gray-400" />
      </button>

      {/* Super Like */}
      <button
        onClick={onSuperLike}
        disabled={disabled}
        className={cn(
          'relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-violet-300 bg-white shadow-md transition-all',
          'hover:scale-105 hover:border-violet-400 hover:shadow-lg',
          'active:scale-95',
          'disabled:opacity-50 disabled:hover:scale-100'
        )}
        aria-label="超級喜歡"
        data-action="super-like"
      >
        <Star className="h-5 w-5 text-violet-500" />
        <span className="absolute -bottom-1 -right-1 flex h-5 items-center rounded-full bg-violet-500 px-1.5 text-[10px] font-bold text-white">
          💎
        </span>
      </button>

      {/* Like */}
      <button
        onClick={onLike}
        disabled={disabled}
        className={cn(
          'flex h-16 w-16 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-brand-500/30 transition-all',
          'hover:scale-105 hover:bg-brand-600 hover:shadow-xl hover:shadow-brand-500/40',
          'active:scale-95',
          'disabled:opacity-50 disabled:hover:scale-100'
        )}
        aria-label="喜歡"
        data-action="like"
      >
        <Heart className="h-7 w-7 text-white" />
      </button>
    </div>
  );
}
