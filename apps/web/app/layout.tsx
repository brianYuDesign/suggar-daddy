import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '../providers/auth-provider';

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
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
