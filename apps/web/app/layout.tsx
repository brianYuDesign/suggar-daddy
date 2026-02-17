import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '../providers/auth-provider';
import { ToastProvider } from '../providers/toast-provider';
import { ErrorBoundary } from '@suggar-daddy/ui';

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
  return (
    <html lang="zh-Hant">
      <body>
        <ErrorBoundary
          showDetails={process.env.NODE_ENV === 'development'}
          onError={(error, errorInfo) => {
            // 在生產環境可以發送到錯誤監控服務（如 Sentry）
            console.error('Application Error:', error, errorInfo);
          }}
        >
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
