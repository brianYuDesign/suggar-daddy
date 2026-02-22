import Link from 'next/link';
import { LandingHero } from './components/landing-hero';
import { BlogCard } from './(public)/blog/components/BlogCard';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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

async function getLatestBlogs(): Promise<Blog[]> {
  try {
    const res = await fetch(`${API_BASE}/api/blogs?limit=3`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export default async function LandingPage() {
  const blogs = await getLatestBlogs();

  return (
    <main className="flex min-h-screen flex-col">
      <LandingHero />

      {/* Latest Blogs */}
      {blogs.length > 0 && (
        <section className="border-t bg-white px-6 py-16">
          <div className="mx-auto max-w-lg sm:max-w-5xl">
            <div className="mb-10 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">探索部落格</h2>
              <Link
                href="/blog"
                className="text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors"
              >
                查看全部 →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">關於</p>
              <nav className="mt-3 flex flex-col gap-2">
                <Link href="/about" className="text-sm text-gray-500 hover:text-gray-700">關於我們</Link>
                <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-700">部落格</Link>
                <Link href="/contact" className="text-sm text-gray-500 hover:text-gray-700">聯絡我們</Link>
              </nav>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">支援</p>
              <nav className="mt-3 flex flex-col gap-2">
                <Link href="/faq" className="text-sm text-gray-500 hover:text-gray-700">常見問題</Link>
                <Link href="/community-guidelines" className="text-sm text-gray-500 hover:text-gray-700">社群守則</Link>
              </nav>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">法律</p>
              <nav className="mt-3 flex flex-col gap-2">
                <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-700">服務條款</Link>
                <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-700">隱私權政策</Link>
                <Link href="/cookie-policy" className="text-sm text-gray-500 hover:text-gray-700">Cookie 政策</Link>
              </nav>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Suggar Daddy</p>
              <p className="mt-3 text-sm text-gray-500">
                致力於建立真誠連結的社交平台
              </p>
            </div>
          </div>
          <div className="mt-8 border-t pt-6 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} Suggar Daddy. All rights reserved.
          </div>
        </div>
      </footer>
    </main>
  );
}
