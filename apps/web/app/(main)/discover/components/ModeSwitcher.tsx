'use client';

import { cn } from '@suggar-daddy/ui';
import { LayoutGrid, Layers, Map } from 'lucide-react';

export type ViewMode = 'card' | 'grid' | 'map';

interface ModeSwitcherProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const modes: { value: ViewMode; icon: typeof Layers; label: string }[] = [
  { value: 'card', icon: Layers, label: '卡片' },
  { value: 'grid', icon: LayoutGrid, label: '列表' },
  { value: 'map', icon: Map, label: '地圖' },
];

export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  return (
    <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
      {modes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            'flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
            mode === value
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
          aria-label={label}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
