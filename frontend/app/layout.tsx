import type { Metadata } from 'next'
import './globals.css'
import { StoreProvider } from './providers'

export const metadata: Metadata = {
  title: 'Sugar Daddy - Creator Platform',
  description: 'Discover amazing creators and support them directly',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  )
}
