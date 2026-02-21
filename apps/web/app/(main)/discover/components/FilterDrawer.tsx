'use client';

import { useState, useEffect } from 'react';
import { Button, cn } from '@suggar-daddy/ui';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import type { DiscoveryFilters } from '../hooks/useFilters';
import type { InterestTagDto } from '@suggar-daddy/dto';

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: DiscoveryFilters;
  onUpdateFilter: <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => void;
  onReset: () => void;
  onApply: () => void;
  availableTags: InterestTagDto[];
}

function RangeSlider({
  label,
  min,
  max,
  value,
  onChange,
  unit,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-brand-600 font-semibold">
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand-500"
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-brand-500' : 'bg-gray-200'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </label>
  );
}

const TAG_CATEGORIES: { key: string; label: string }[] = [
  { key: 'lifestyle', label: '生活方式' },
  { key: 'interests', label: '興趣愛好' },
  { key: 'expectations', label: '期望' },
  { key: 'personality', label: '個性' },
];

export function FilterDrawer({
  open,
  onClose,
  filters,
  onUpdateFilter,
  onReset,
  onApply,
  availableTags,
}: FilterDrawerProps) {
  if (!open) return null;

  const tagsByCategory = TAG_CATEGORIES.map((cat) => ({
    ...cat,
    tags: availableTags.filter((t) => t.category === cat.key),
  }));

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl animate-in slide-in-from-bottom md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-96 md:rounded-t-none md:rounded-l-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">篩選條件</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              重置
            </button>
            <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 px-4 py-4">
          {/* Distance */}
          <RangeSlider
            label="距離範圍"
            min={1}
            max={500}
            value={filters.radius}
            onChange={(v) => onUpdateFilter('radius', v)}
            unit=" km"
          />

          {/* Age range */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700">
              年齡範圍: {filters.ageMin} - {filters.ageMax}
            </span>
            <div className="flex gap-3">
              <input
                type="range"
                min={18}
                max={80}
                value={filters.ageMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v <= filters.ageMax) onUpdateFilter('ageMin', v);
                }}
                className="w-full accent-brand-500"
              />
              <input
                type="range"
                min={18}
                max={80}
                value={filters.ageMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (v >= filters.ageMin) onUpdateFilter('ageMax', v);
                }}
                className="w-full accent-brand-500"
              />
            </div>
          </div>

          {/* User Type */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700">對象類型</span>
            <div className="flex gap-2">
              {[
                { value: undefined, label: '不限' },
                { value: 'sugar_daddy' as const, label: 'Sugar Daddy' },
                { value: 'sugar_baby' as const, label: 'Sugar Baby' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => onUpdateFilter('userType', opt.value)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                    filters.userType === opt.value
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-1 border-t pt-4">
            <Toggle
              label="僅顯示已認證用戶"
              checked={filters.verifiedOnly}
              onChange={(v) => onUpdateFilter('verifiedOnly', v)}
            />
            <Toggle
              label="僅顯示最近上線"
              checked={filters.onlineRecently}
              onChange={(v) => onUpdateFilter('onlineRecently', v)}
            />
          </div>

          {/* Interest Tags */}
          {tagsByCategory.map((cat) =>
            cat.tags.length > 0 ? (
              <div key={cat.key} className="space-y-2">
                <span className="text-sm font-medium text-gray-700">{cat.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {cat.tags.map((tag) => {
                    const selected = filters.tagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => {
                          const next = selected
                            ? filters.tagIds.filter((id) => id !== tag.id)
                            : [...filters.tagIds, tag.id];
                          onUpdateFilter('tagIds', next);
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                          selected
                            ? 'border-brand-300 bg-brand-50 text-brand-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        )}
                      >
                        {tag.icon && <span>{tag.icon}</span>}
                        {tag.nameZh || tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t bg-white px-4 py-3">
          <Button
            className="w-full bg-brand-500 hover:bg-brand-600"
            onClick={() => {
              onApply();
              onClose();
            }}
          >
            套用篩選
          </Button>
        </div>
      </div>
    </>
  );
}
