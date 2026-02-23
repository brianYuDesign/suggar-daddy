'use client';

import { useAuth } from '../../providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/feed');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-900 border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Top bar */}
      <header className="flex items-center justify-center px-6 py-4">
        <a href="/" className="text-xl font-bold tracking-tight text-neutral-900">
          Suggar Daddy
        </a>
      </header>
      {/* Content */}
      <main className="flex flex-1 flex-col items-center px-6 pb-10 pt-4">
        {children}
      </main>
      {/* Footer */}
      <footer className="flex items-center justify-center gap-4 px-6 py-4 text-xs text-gray-400">
        <a href="/privacy" className="hover:text-gray-600">隱私權政策</a>
        <span>|</span>
        <a href="/terms" className="hover:text-gray-600">服務條款</a>
        <span>|</span>
        <a href="/community-guidelines" className="hover:text-gray-600">社群守則</a>
      </footer>
    </div>
  );
}
