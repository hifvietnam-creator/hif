import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'

import { getKqUser } from '@/lib/kq/auth'
import { openSession, upcomingSunday } from '@/lib/kq/station'

export const dynamic = 'force-dynamic'

/**
 * Finds or creates the session for a group on a date, then redirects into it.
 *
 * A separate route rather than a button that POSTs, because two TAs opening the
 * same room on two tablets must land on one session. openSession() is
 * idempotent, so arriving here twice is harmless.
 */
export default async function OpenSession({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; date?: string }>
}) {
  const user = await getKqUser(await nextHeaders())
  if (!user) redirect('/admin/login?redirect=/kq/station')

  const { group, date } = await searchParams
  if (!group) redirect('/kq/station')

  const session = await openSession(date || upcomingSunday(), group)
  redirect(`/kq/station/${session.id}`)
}
