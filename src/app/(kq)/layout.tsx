import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import React from 'react'

import './kq.css'

/**
 * Root layout for the KidzQuest station.
 *
 * Its own route group, following the same reasoning as (dashboard): each
 * top-level group needs its own <html>/<body>, and the station must not drag
 * public site chrome onto a screen a volunteer uses one-handed at a door.
 *
 * Deliberately not indexed. These URLs list children by name.
 */

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export const metadata: Metadata = {
  title: 'KidzQuest',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // No zoom-on-focus when a TA taps a search field mid-queue.
  maximumScale: 1,
  themeColor: '#1f6f8b',
}

export default function KqRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={inter.variable} lang="en" suppressHydrationWarning>
      <head>
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
      </head>
      <body className="font-[family-name:var(--font-inter)] antialiased">{children}</body>
    </html>
  )
}
