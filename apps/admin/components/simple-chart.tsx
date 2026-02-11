'use client';

import { cn } from '@/lib/utils';

interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
  className?: string;
}

export function SimpleBarChart({ data, height = 200, className }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className={cn('flex items-end gap-1', className)} style={{ height }}>
      {data.map((item, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[10px] text-muted-foreground">
            {item.value > 0 ? item.value.toLocaleString() : ''}
          </span>
          <div
            className="w-full rounded-t bg-primary/80 transition-all"
            style={{ height: `${(item.value / max) * 100}%`, minHeight: item.value > 0 ? 4 : 0 }}
          />
          <span className="text-[10px] text-muted-foreground truncate w-full text-center">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
