import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'

import Shell from '@/components/kq/Shell'
import { getKqUser } from '@/lib/kq/auth'
import { listStaff } from '@/lib/kq/staff'
import { upcomingSunday } from '@/lib/kq/station'

import StaffTable from '../teachers/StaffTable'

export const dynamic = 'force-dynamic'

/**
 * Same screen as Teachers, filtered to assistants.
 *
 * Two routes rather than one with a tab, because the sidebar in the approved
 * design lists them separately and that is how the ministry talks about them.
 * The table itself is shared — the only difference is the role filter and what
 * the two roles are allowed to do.
 */
export default async function AssistantsPage() {
  const user = await getKqUser(await nextHeaders())
  if (!user) redirect('/admin/login?redirect=/kq/assistants')
  if (user.role !== 'admin') redirect('/kq/station')

  const date = upcomingSunday()
  const staff = await listStaff(date)

  const pretty = new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })

  return (
    <Shell current="/kq/assistants" user={{ name: user.name ?? user.email, role: user.role }}>
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Teaching assistants</h1>
        <p className="mt-0.5 text-sm text-hifmuted">
          Assigning for {pretty}. Serving history is all-time.
        </p>
      </header>

      <div className="mb-4 rounded-card border border-flag/30 bg-flag-soft px-4 py-3 text-sm text-flag">
        <b>Assistants cannot approve an override.</b> They check children in and out of
        their own room against the authorised list. Releasing a child to anyone not on
        that list needs a teacher or an administrator — deliberately, so the one path
        around the safeguarding check costs a more senior name.
      </div>

      <StaffTable initial={staff} date={date} role="ta" />
    </Shell>
  )
}
