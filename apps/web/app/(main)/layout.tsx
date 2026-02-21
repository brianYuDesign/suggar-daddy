'use client';

import { useAuth } from '../../providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MobileNav } from '../../components/layout/mobile-nav';
import { DesktopSidebar } from '../../components/layout/desktop-sidebar';
import { NotificationProvider } from '../../providers/notification-provider';
import DiamondBalance from '../components/DiamondBalance';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-gray-50">
        <DesktopSidebar />

        {/* Main content area */}
        <div className="md:pl-60">
          {/* Top bar with diamond balance */}
          <div className="sticky top-0 z-10 flex items-center justify-end bg-gray-50/80 px-4 py-2 backdrop-blur-sm md:px-6">
            <DiamondBalance />
          </div>
          <main className="mx-auto max-w-2xl px-4 pb-20 pt-2 md:pb-8 md:pt-4">
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </NotificationProvider>
  );
}
