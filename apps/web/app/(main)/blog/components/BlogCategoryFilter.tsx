// apps/web/app/(main)/blog/components/BlogCategoryFilter.tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';

const CATEGORIES = [
  { value: '', label: '全部' },
  { value: 'guide', label: '使用指南' },
  { value: 'safety', label: '安全須知' },
  { value: 'tips', label: '約會技巧' },
  { value: 'story', label: '用戶故事' },
  { value: 'news', label: '平台公告' },
];

interface BlogCategoryFilterProps {
  activeCategory?: string;
}

export function BlogCategoryFilter({ activeCategory }: BlogCategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCategory = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('category', value);
    } else {
      params.delete('category');
    }
    params.delete('page');
    router.push(`/blog?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const isActive = (activeCategory ?? '') === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => handleCategory(cat.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isActive
                ? 'bg-rose-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-300 hover:text-rose-500'
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}