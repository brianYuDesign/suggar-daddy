import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '../providers/auth-provider';
import { ToastProvider } from '../providers/toast-provider';
import { ErrorBoundary } from '@suggar-daddy/ui';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Suggar Daddy',
    template: '%s | Suggar Daddy',
  },
  description: '探索你的理想關係，連結志同道合的人',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <html lang="zh-Hant" className={inter.variable}>
      <body className={inter.className}>
        <ErrorBoundary showDetails={isDevelopment}>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
