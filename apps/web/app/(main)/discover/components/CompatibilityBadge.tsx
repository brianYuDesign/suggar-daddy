'use client';

import { cn } from '@suggar-daddy/ui';

interface CompatibilityBadgeProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-brand-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-gray-400';
}

function getStrokeColor(score: number): string {
  if (score >= 80) return 'stroke-green-500';
  if (score >= 60) return 'stroke-brand-500';
  if (score >= 40) return 'stroke-yellow-500';
  return 'stroke-gray-300';
}

const sizes = {
  sm: { wh: 36, r: 14, strokeWidth: 3, textSize: 'text-xs' },
  md: { wh: 48, r: 18, strokeWidth: 4, textSize: 'text-sm' },
  lg: { wh: 64, r: 26, strokeWidth: 5, textSize: 'text-base' },
};

export function CompatibilityBadge({ score, size = 'md', showLabel = false }: CompatibilityBadgeProps) {
  const { wh, r, strokeWidth, textSize } = sizes[size];
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: wh, height: wh }}>
        <svg className="rotate-[-90deg]" width={wh} height={wh}>
          <circle
            cx={wh / 2}
            cy={wh / 2}
            r={r}
            fill="none"
            className="stroke-gray-200"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={wh / 2}
            cy={wh / 2}
            r={r}
            fill="none"
            className={cn(getStrokeColor(score), 'transition-all duration-500')}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center font-bold',
            textSize,
            getScoreColor(score)
          )}
        >
          {score}
        </span>
      </div>
      {showLabel && <span className="text-xs text-gray-500">相容度</span>}
    </div>
  );
}
