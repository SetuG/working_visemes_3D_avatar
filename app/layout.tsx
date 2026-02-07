import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Avatar Platform',
  description: 'Interactive AI avatar with lip-sync and text-to-speech capabilities',
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
