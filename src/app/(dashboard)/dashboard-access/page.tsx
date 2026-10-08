import Link from 'next/link'
import React from 'react'

import { checkDashboardAccess } from '@/lib/dashboard-auth'

// Outside /dashboard on purpose: it sits under the route group's root layout
// only, so it does not inherit the dashboard's own access check and loop.
export const dynamic = 'force-dynamic'

export default async function DashboardAccessPage() {
  const access = await checkDashboardAccess()

  return (
    <main className="mx-auto max-w-lg px-6 py-24 text-neutral-900 dark:text-neutral-100">
      <h1 className="text-xl font-semibold">You don&apos;t have access to the dashboard</h1>
      <p className="mt-4 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
        The dashboard shows people&apos;s names, email addresses and contact preferences, so it is
        limited to site administrators.
        {access.user?.email ? (
          <>
            {' '}
            You are signed in as <strong>{access.user.email}</strong>.
          </>
        ) : null}{' '}
        If you need it for your ministry, ask a site administrator to give your account access.
      </p>
      <p className="mt-8 text-sm">
        <Link href="/" className="underline">
          Back to the website
        </Link>
      </p>
    </main>
  )
}
