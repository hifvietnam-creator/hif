import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'

import Shell from '@/components/kq/Shell'
import { getKqUser } from '@/lib/kq/auth'
import { listStaff } from '@/lib/kq/staff'
import { upcomingSunday } from '@/lib/kq/station'

import StaffTable from './StaffTable'

export const dynamic = 'force-dynamic'

export default async function TeachersPage() {
  const user = await getKqUser(await nextHeaders())
  if (!user) redirect('/admin/login?redirect=/kq/teachers')
  if (user.role !== 'admin') redirect('/kq/station')

  const date = upcomingSunday()
  const staff = await listStaff(date)

  const pretty = new Date(date + 'T00:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })

  return (
    <Shell current="/kq/teachers" user={{ name: user.name ?? user.email, role: user.role }}>
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Teachers</h1>
        <p className="mt-0.5 text-sm text-hifmuted">
          Assigning for {pretty}. Serving history is all-time.
        </p>
      </header>

      <div className="mb-4 rounded-card border border-brand/25 bg-brand-soft px-4 py-3 text-sm text-[#14536b]">
        <b>A teacher can only open the room they are assigned to.</b> That is what makes a
        TA unable to check a child out of somebody else&rsquo;s class — it falls out of this
        assignment rather than being a rule anyone has to remember. Teachers can also
        approve a collection override; assistants cannot.
      </div>

      <StaffTable initial={staff} date={date} role="teacher" />
    </Shell>
  )
}
