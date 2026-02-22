'use client';

import { useState, useEffect } from 'react';
import { cn } from '@suggar-daddy/ui';
import { tagsApi } from '../lib/api';
import type { InterestTagDto } from '@suggar-daddy/dto';

interface InterestTagPickerProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  maxTotal?: number;
  maxPerCategory?: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  lifestyle: '生活方式',
  interests: '興趣愛好',
  expectations: '期望',
  personality: '性格特質',
};

export function InterestTagPicker({
  selectedTagIds,
  onChange,
  maxTotal = 20,
  maxPerCategory = 5,
}: InterestTagPickerProps) {
  const [allTags, setAllTags] = useState<InterestTagDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tagsApi
      .getAllTags()
      .then((res) => setAllTags(res.tags || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group tags by category
  const tagsByCategory = new Map<string, InterestTagDto[]>();
  for (const tag of allTags) {
    const list = tagsByCategory.get(tag.category) || [];
    list.push(tag);
    tagsByCategory.set(tag.category, list);
  }

  const toggle = (tagId: string, category: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
      return;
    }

    // Check max per category
    const categoryTags = allTags.filter((t) => t.category === category);
    const selectedInCategory = categoryTags.filter((t) =>
      selectedTagIds.includes(t.id)
    ).length;
    if (selectedInCategory >= maxPerCategory) return;

    // Check max total
    if (selectedTagIds.length >= maxTotal) return;

    onChange([...selectedTagIds, tagId]);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <div
                  key={j}
                  className="h-8 w-16 animate-pulse rounded-full bg-gray-100"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const categories = ['lifestyle', 'interests', 'expectations', 'personality'];

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">
        已選 {selectedTagIds.length}/{maxTotal}
      </p>
      {categories.map((category) => {
        const tags = tagsByCategory.get(category) || [];
        if (tags.length === 0) return null;

        const selectedInCategory = tags.filter((t) =>
          selectedTagIds.includes(t.id)
        ).length;

        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">
                {CATEGORY_LABELS[category] || category}
              </p>
              <span className="text-xs text-gray-400">
                {selectedInCategory}/{maxPerCategory} 已選
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                const isDisabled =
                  !isSelected &&
                  (selectedInCategory >= maxPerCategory ||
                    selectedTagIds.length >= maxTotal);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => toggle(tag.id, category)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all',
                      isSelected
                        ? 'border-neutral-900 bg-neutral-900 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400',
                      isDisabled && !isSelected && 'opacity-40 cursor-not-allowed'
                    )}
                  >
                    {tag.icon && <span className="text-xs">{tag.icon}</span>}
                    {tag.nameZh || tag.name}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
