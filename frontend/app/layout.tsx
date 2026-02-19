import type { Metadata } from 'next'
import './globals.css'
import { StoreProvider } from './providers'

export const metadata: Metadata = {
  title: 'Sugar Daddy - Creator Platform',
  description: 'Discover amazing creators and support them directly',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Sugar Daddy - Creator Platform',
    description: 'Discover amazing creators and support them directly',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://sugar-daddy.com',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ec4899" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta httpEquiv="x-ua-compatible" content="IE=edge" />
      </head>
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
        <script>{`
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
          }
        `}</script>
      </body>
    </html>
  )
}
