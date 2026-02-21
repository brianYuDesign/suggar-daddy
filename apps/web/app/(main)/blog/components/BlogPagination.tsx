// apps/web/app/(main)/blog/components/BlogPagination.tsx
import Link from 'next/link';

interface BlogPaginationProps {
  currentPage: number;
  totalPages: number;
  category?: string;
  search?: string;
}

export function BlogPagination({ currentPage, totalPages, category, search }: BlogPaginationProps) {
  const buildHref = (page: number) => {
    const qs = new URLSearchParams();
    qs.set('page', String(page));
    if (category) qs.set('category', category);
    if (search) qs.set('search', search);
    return `/blog?${qs.toString()}`;
  };

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const showPages = pages.filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1);

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      {currentPage > 1 && (
        <Link href={buildHref(currentPage - 1)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-rose-400 hover:text-rose-500 text-sm transition">
          ← 上一頁
        </Link>
      )}
      {showPages.map((page, idx) => {
        const prev = showPages[idx - 1];
        const showEllipsis = prev && page - prev > 1;
        return (
          <span key={page} className="flex items-center gap-2">
            {showEllipsis && <span className="text-gray-400 text-sm">...</span>}
            <Link
              href={buildHref(page)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition ${page === currentPage ? 'bg-rose-500 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:border-rose-400 hover:text-rose-500'}`}
            >
              {page}
            </Link>
          </span>
        );
      })}
      {currentPage < totalPages && (
        <Link href={buildHref(currentPage + 1)} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:border-rose-400 hover:text-rose-500 text-sm transition">
          下一頁 →
        </Link>
      )}
    </div>
  );
}