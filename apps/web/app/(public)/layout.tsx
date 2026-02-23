import Link from 'next/link';

const footerLinks = [
  { href: '/privacy', label: '隱私權政策' },
  { href: '/terms', label: '服務條款' },
  { href: '/community-guidelines', label: '社群守則' },
  { href: '/about', label: '關於我們' },
  { href: '/contact', label: '聯絡我們' },
  { href: '/faq', label: '常見問題' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-lg font-bold text-neutral-900">
            Suggar Daddy
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/blog"
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              部落格
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors"
            >
              登入
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-white px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Suggar Daddy. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
