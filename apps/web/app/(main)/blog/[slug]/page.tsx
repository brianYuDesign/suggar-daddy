// apps/web/app/(main)/blog/[slug]/page.tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';
import { BlogCard } from '../components/BlogCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

const CATEGORY_LABEL: Record<string, string> = {
  guide: '使用指南',
  safety: '安全須知',
  tips: '約會技巧',
  story: '用戶故事',
  news: '平台公告',
};

async function getBlog(slug: string) {
  const res = await fetch(`${API_BASE}/api/blogs/${slug}`, {
    next: { revalidate: 300 },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch blog');
  return res.json();
}

async function getRelated(id: string) {
  const res = await fetch(`${API_BASE}/api/blogs/${id}/related`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlog(slug);
  if (!blog) return { title: '文章不存在' };
  return {
    title: blog.metaTitle || `${blog.title} | Suggar Daddy 部落格`,
    description: blog.metaDescription || blog.excerpt,
    openGraph: {
      title: blog.title,
      description: blog.excerpt,
      images: blog.coverImage ? [blog.coverImage] : [],
    },
  };
}

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const blog = await getBlog(slug);
  if (!blog) notFound();

  const related = await getRelated(blog.id);

  const publishedDate = blog.publishedAt
    ? new Date(blog.publishedAt).toLocaleDateString('zh-TW', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const readingTime = Math.max(1, Math.ceil(blog.content.replace(/<[^>]*>/g, '').length / 200));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: blog.title,
    description: blog.excerpt || '',
    image: blog.coverImage || undefined,
    datePublished: blog.publishedAt,
    dateModified: blog.updatedAt,
    author: blog.authorName ? { '@type': 'Person', name: blog.authorName } : undefined,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-rose-400 to-pink-500">
        {blog.coverImage && (
          <Image
            src={blog.coverImage}
            alt={blog.title}
            fill
            className="object-cover opacity-40"
            unoptimized
          />
        )}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-3xl mx-auto w-full px-4 pb-8">
            <Link
              href="/blog"
              className="text-rose-100 text-sm hover:text-white flex items-center gap-1 mb-3"
            >
              ← 返回部落格
            </Link>
            <span className="text-xs font-semibold bg-white/20 text-white px-3 py-1 rounded-full">
              {CATEGORY_LABEL[blog.category] ?? blog.category}
            </span>
            <h1 className="text-white text-2xl md:text-3xl font-bold mt-3 leading-snug">
              {blog.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-8 pb-6 border-b">
          {blog.authorName && <span>作者:{blog.authorName}</span>}
          {publishedDate && <span>{publishedDate}</span>}
          <span>{readingTime} 分鐘閱讀</span>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {blog.viewCount?.toLocaleString()} 次瀏覽
          </span>
        </div>

        {/* Body */}
        <article
          className="prose prose-gray prose-lg prose-headings:font-bold prose-a:text-rose-500 prose-img:rounded-xl prose-blockquote:border-rose-300 max-w-none"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Tags */}
        {blog.tags?.length > 0 && (
          <div className="mt-10 flex flex-wrap gap-2">
            {blog.tags.map((tag: string) => (
              <Link
                key={tag}
                href={`/blog?tag=${tag}`}
                className="text-xs px-3 py-1 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 pb-16">
          <h2 className="text-xl font-bold text-gray-800 mb-6">相關文章</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((b: { id: string; title: string; slug: string; excerpt: string; coverImage?: string; category: string; tags?: string[]; viewCount: number; publishedAt: string; authorName?: string }) => (
              <BlogCard key={b.id} blog={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}