// apps/web/app/(main)/blog/page.tsx
import { Suspense } from 'react';
import { BlogList } from './components/BlogList';
import { BlogCategoryFilter } from './components/BlogCategoryFilter';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '部落格 | Suggar Daddy',
  description: '探索精彩文章，了解更多關於甜蜜關係的資訊與技巧',
};

interface BlogPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    search?: string;
    tag?: string;
  }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const category = params.category;
  const search = params.search;
  const tag = params.tag;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Suggar Daddy Blog',
    description: '探索精彩文章，了解更多關於甜蜜關係的資訊與技巧',
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://suggar-daddy.com'}/blog`,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">探索部落格</h1>
          <p className="text-rose-100 text-lg">精選文章、使用指南與安全須知，讓你的體驗更美好</p>
          <form className="mt-8 flex gap-2 max-w-xl mx-auto" method="GET">
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="搜尋文章..."
              className="flex-1 px-4 py-3 rounded-xl text-gray-800 outline-none"
            />
            <button type="submit" className="px-6 py-3 bg-white text-rose-500 font-semibold rounded-xl hover:bg-rose-50 transition">
              搜尋
            </button>
          </form>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <BlogCategoryFilter activeCategory={category} />
        <Suspense fallback={<BlogListSkeleton />}>
          <BlogList page={page} category={category} search={search} tag={tag} />
        </Suspense>
      </div>
    </div>
  );
}

function BlogListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse">
          <div className="h-48 bg-gray-200" />
          <div className="p-6 space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}