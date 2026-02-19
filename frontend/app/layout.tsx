import type { Metadata } from 'next'
import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}
