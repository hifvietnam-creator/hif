import Link from 'next/link'
import React from 'react'

import { getMeUser } from '@/utilities/getMeUser'

// Always fresh: these figures are the point of the page, and a cached number
// nobody can explain is worse than a slow one.
export const dynamic = 'force-dynamic'

// Note: <html>/<body> and metadata live in the route group's root layout at
// src/app/(dashboard)/layout.tsx. This is the nested chrome only.

const NAV = [
  { href: '/dashboard', label: 'Congregation' },
  { href: '/dashboard/ministries', label: 'Ministries' },
  { href: '/dashboard/reachability', label: 'Reachability' },
  { href: '/dashboard/serving', label: 'Serving' },
  // Further sections are added as each is confirmed with the staff who own
  // the underlying data.
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Payload auth. Anyone without a valid session is sent to the admin login.
  const { user } = await getMeUser({ nullUserRedirect: '/admin/login' })

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <span className="text-sm font-semibold tracking-tight">HIF Dashboard</span>
            <nav className="flex gap-4">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4 text-xs text-neutral-500">
            <span>{user?.email}</span>
            <Link href="/admin" className="hover:text-neutral-900 dark:hover:text-neutral-100">
              Admin
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>

      <footer className="mx-auto max-w-6xl px-6 pb-12 pt-4">
        <p className="text-xs leading-relaxed text-neutral-500">
          Figures are direct counts from Planning Center, mirrored into a reporting database.
          Nothing on this page is estimated or inferred, and no data is written back to Planning
          Center. If a number looks wrong, it is wrong in Planning Center or wrong in the sync —
          please say which, so it can be traced.
        </p>
      </footer>
    </div>
  )
}
