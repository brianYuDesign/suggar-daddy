// apps/web/app/(main)/blog/components/BlogCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

const CATEGORY_LABEL: Record<string, string> = {
  guide: '使用指南',
  safety: '安全須知',
  tips: '約會技巧',
  story: '用戶故事',
  news: '平台公告',
};

const CATEGORY_COLOR: Record<string, string> = {
  guide: 'bg-blue-100 text-blue-700',
  safety: 'bg-red-100 text-red-700',
  tips: 'bg-rose-100 text-rose-700',
  story: 'bg-purple-100 text-purple-700',
  news: 'bg-green-100 text-green-700',
};

interface Blog {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: string;
  category: string;
  tags?: string[];
  viewCount: number;
  publishedAt: string;
  authorName?: string;
}

function estimateReadingTime(text: string): number {
  const wordCount = text.replace(/<[^>]*>/g, '').length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function BlogCard({ blog }: { blog: Blog }) {
  const [imgError, setImgError] = useState(false);
  const publishedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const readingTime = estimateReadingTime(blog.excerpt || blog.title);

  const showImage = blog.coverImage && !imgError;

  return (
    <Link href={`/blog/${blog.slug}`}>
      <article className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 h-full flex flex-col group">
        <div className="relative h-48 bg-gradient-to-br from-rose-100 to-pink-100 overflow-hidden">
          {showImage ? (
            <Image
              src={blog.coverImage!}
              alt={blog.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl">💝</span>
            </div>
          )}
          <span className={`absolute top-3 left-3 text-xs font-semibold px-3 py-1 rounded-full ${CATEGORY_COLOR[blog.category] ?? 'bg-gray-100 text-gray-600'}`}>
            {CATEGORY_LABEL[blog.category] ?? blog.category}
          </span>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <h2 className="text-gray-900 font-bold text-lg leading-snug line-clamp-2 mb-2 group-hover:text-rose-500 transition-colors">
            {blog.title}
          </h2>
          {blog.excerpt && <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 flex-1">{blog.excerpt}</p>}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span>{publishedDate}</span>
              <span className="text-gray-300">|</span>
              <span>{readingTime} min</span>
            </div>
            <span className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {blog.viewCount.toLocaleString()}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
