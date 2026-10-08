/**
 * Who may see /dashboard.
 *
 * The dashboard shows named people, email addresses, and who unsubscribed from
 * what. Until October 2026 any signed-in account could read it — including a
 * KidzQuest teaching assistant whose login exists only to check children in.
 *
 * It now needs the site-wide role, `siteAdmin`, the same flag that reaches the
 * CMS (see src/access/kq.ts for why that flag is separate from ministry roles).
 * A ministry role such as kqRole === 'admin' is deliberately not enough.
 *
 * WHERE THIS MUST BE CALLED — all three, because none of them covers the others:
 *
 *   the dashboard layout   so the chrome and nav never render for anyone else
 *   every dashboard page   a layout is not a security boundary in the App
 *                          Router: on client navigation only the changed
 *                          segment is fetched and the layout does not re-run
 *   every route handler    /dashboard/.../export and /api/dashboard/* have no
 *                          layout above them at all
 *
 * Server-only. It imports Payload, so a client component must never import it.
 */

import { headers as nextHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import type { User } from '@/payload-types'

export type DashboardAccess =
  | { ok: true; user: User }
  | { ok: false; reason: 'signed-out' | 'not-permitted'; user: User | null }

/** Checks the request's session without redirecting. For route handlers. */
export async function checkDashboardAccess(headers?: Headers): Promise<DashboardAccess> {
  const payload = await getPayload({ config: configPromise })
  const { user } = await payload.auth({ headers: headers ?? (await nextHeaders()) })
  if (!user) return { ok: false, reason: 'signed-out', user: null }

  const siteAdmin = (user as unknown as { siteAdmin?: boolean | null }).siteAdmin === true
  if (!siteAdmin) return { ok: false, reason: 'not-permitted', user: user as User }

  return { ok: true, user: user as User }
}

/**
 * For layouts and pages. Returns the user when they may see the dashboard;
 * otherwise redirects — to the login page if signed out, or to a plain
 * "no access" page if signed in without the role.
 */
export async function requireDashboardUser(): Promise<User> {
  const access = await checkDashboardAccess()
  if (access.ok) return access.user
  if (access.reason === 'signed-out') redirect('/admin/login?redirect=%2Fdashboard')
  redirect('/dashboard-access')
}
