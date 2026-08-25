import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'

import { getKqUser } from '@/lib/kq/auth'
import { getPool } from '@/lib/db'
import { upcomingSunday } from '@/lib/kq/station'

export const dynamic = 'force-dynamic'

/**
 * Room picker — the first screen a TA sees.
 *
 * Lists this Sunday's rooms with the count already checked in, so somebody
 * arriving late can see at a glance which room is mid-service.
 */
export default async function StationPicker() {
  const user = await getKqUser(await nextHeaders())
  if (!user) redirect('/admin/login?redirect=/kq/station')

  const sunday = upcomingSunday()
  const db = getPool()

  // Every active group, with this Sunday's session if one has been opened.
  const { rows } = await db.query<{
    code: string; label: string; session_id: string | null
    expected: string; present: string; collected: string
  }>(
    `select g.code, g.label,
            s.id as session_id,
            (select count(*) from kq.current_roster r where r.group_code = g.code)::text as expected,
            coalesce((select count(*) from kq.attendance a
                       where a.session_id = s.id and a.status = 'present'), 0)::text as present,
            coalesce((select count(*) from kq.attendance a
                       where a.session_id = s.id and a.status = 'checked_out'), 0)::text as collected
       from kq.groups g
       left join kq.sessions s on s.group_code = g.code and s.service_date = $1
      where g.active and g.code <> 'aftershock'
      order by g.sort_order`,
    [sunday],
  )

  const pretty = new Date(sunday + 'T00:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">KidzQuest</h1>
        <p className="mt-1 text-sm text-hifmuted">
          {pretty} · signed in as {user.name ?? user.email} ({user.role})
        </p>
      </header>

      <div className="space-y-3">
        {rows.map((r) => {
          const expected = Number(r.expected)
          const present = Number(r.present)
          const collected = Number(r.collected)
          const started = r.session_id !== null

          return (
            <Link
              key={r.code}
              href={`/kq/station/open?group=${r.code}&date=${sunday}`}
              className="kq-tap flex items-center gap-4 rounded-card border border-line bg-paper p-4 shadow-sm transition hover:border-brand"
            >
              <div className="flex-1">
                <div className="text-lg font-semibold text-ink">{r.label}</div>
                <div className="text-sm text-hifmuted">
                  {expected === 0 ? (
                    <span className="text-flag">Nobody on the register</span>
                  ) : (
                    <>
                      {expected} on the register
                      {started && ` · ${present} here · ${collected} dismissed`}
                    </>
                  )}
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  started ? 'bg-ok-soft text-ok-ink' : 'bg-mist text-hifmuted'
                }`}
              >
                {started ? 'Open' : 'Start'}
              </span>
            </Link>
          )
        })}
      </div>

      {user.role === 'admin' && (
        <p className="mt-8 text-sm text-hifmuted">
          You are an administrator, so you can open any room. Teachers and assistants
          only see rooms they are rostered to.
        </p>
      )}
    </main>
  )
}
