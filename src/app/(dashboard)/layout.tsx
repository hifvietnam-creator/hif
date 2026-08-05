import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import React from 'react'

import './dashboard.css'

/**
 * Root layout for the dashboard route group.
 *
 * Each top-level route group in the App Router needs its own <html>/<body>.
 * This one deliberately does NOT reuse the frontend layout: the dashboard has
 * no public header, footer, or admin bar, and pulling in those providers would
 * drag site chrome onto an internal reporting page.
 */

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HIF Dashboard',
  robots: { index: false, follow: false },
}

export default function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={inter.variable} lang="en" suppressHydrationWarning>
      <head>
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body className="font-[family-name:var(--font-inter)] antialiased">{children}</body>
    </html>
  )
}
