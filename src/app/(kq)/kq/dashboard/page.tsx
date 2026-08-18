import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import Shell from '@/components/kq/Shell'
import { getKqUser } from '@/lib/kq/auth'
import { getOverview } from '@/lib/kq/dashboard'

export const dynamic = 'force-dynamic'

const GROUP_COLOUR: Record<string, string> = {
  explorers: '#3aa6c9',
  voyagers: '#6fa22a',
  trailblazers: '#b7791f',
  pathfinders: '#702e6f',
}

const fmt = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  })

const fmtLong = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })

export default async function DashboardPage() {
  const user = await getKqUser(await nextHeaders())
  if (!user) redirect('/admin/login?redirect=/kq/dashboard')
  if (user.role !== 'admin') redirect('/kq/station')

  const payload = await getPayload({ config: configPromise })
  const [overview, teachers, assistants] = await Promise.all([
    getOverview(),
    payload.count({ collection: 'users', where: { kqRole: { equals: 'teacher' } } }),
    payload.count({ collection: 'users', where: { kqRole: { equals: 'ta' } } }),
  ])

  const delta = overview.attendedLatest - overview.attendedPrevious
  const rate = overview.rosterNow
    ? Math.round((overview.attendedLatest / overview.rosterNow) * 100)
    : 0

  return (
    <Shell current="/kq/dashboard" user={{ name: user.name ?? user.email, role: user.role }}>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
        <p className="mt-0.5 text-sm text-hifmuted">
          {overview.latestSunday
            ? `Latest register: ${fmtLong(overview.latestSunday)} · Hanoi campus`
            : 'No sessions recorded yet'}
        </p>
      </header>

      <div className="mb-4 rounded-card border border-brand/25 bg-brand-soft px-4 py-3 text-sm text-[#14536b]">
        <b>Groups follow school grade, not age.</b> Explorers = Grade 0 · Voyagers =
        Grades 1–2 · Trailblazers = Grades 3–4 · Pathfinders = Grades 5–7. Children move
        up together on the first Sunday of August, not on their birthdays.
      </div>

      {/* Headline numbers */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label={overview.latestSunday ? `Attended ${fmt(overview.latestSunday)}` : 'Attended'}
          value={overview.attendedLatest}
          foot={
            overview.previousSunday ? (
              <>
                <span className={delta >= 0 ? 'font-semibold text-ok-ink' : 'font-semibold text-alert'}>
                  {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}
                </span>{' '}
                vs {fmt(overview.previousSunday)}
              </>
            ) : (
              'no earlier Sunday to compare'
            )
          }
        />
        <Card label="On the roster" value={overview.rosterNow} foot={`${rate}% attendance`} />
        <Card label="Teachers" value={teachers.totalDocs} foot="with a login" />
        <Card label="Assistants" value={assistants.totalDocs} foot="with a login" />
      </div>

      <div className="mb-4 grid gap-3 xl:grid-cols-2">
        {/* By group */}
        <section className="rounded-card border border-line bg-paper shadow-sm">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-[15px] font-semibold text-ink">By group</h2>
          </div>
          <div className="p-4">
            {overview.groups.map((g) => {
              const pc = g.roster ? Math.round((g.attended / g.roster) * 100) : 0
              return (
                <div key={g.code} className="mb-3.5 last:mb-0">
                  <div className="mb-1.5 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink">
                      {g.label}
                      {g.provisional > 0 && (
                        <span className="ml-2 rounded-full bg-flag-soft px-2 py-0.5 text-[11px] font-bold text-flag">
                          {g.provisional} unconfirmed
                        </span>
                      )}
                    </span>
                    <b className="text-ink">
                      {g.attended} / {g.roster}
                    </b>
                  </div>
                  <div className="h-[7px] overflow-hidden rounded-full bg-mist">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${pc}%`, background: GROUP_COLOUR[g.code] ?? '#56575a' }}
                    />
                  </div>
                </div>
              )
            })}
            <p className="mt-3 text-xs text-hifmuted">
              Attended on {overview.latestSunday ? fmt(overview.latestSunday) : '—'}, out of
              those currently on the register.
            </p>
          </div>
        </section>

        {/* Recent Sundays */}
        <section className="rounded-card border border-line bg-paper shadow-sm">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-[15px] font-semibold text-ink">Recent Sundays</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-mist/60 text-[11px] uppercase tracking-wider text-hifmuted">
                <th className="px-4 py-2 text-left font-bold">Date</th>
                <th className="px-4 py-2 text-right font-bold">Attended</th>
                <th className="px-4 py-2 text-right font-bold">Roster</th>
                <th className="px-4 py-2 text-right font-bold">Rate</th>
              </tr>
            </thead>
            <tbody>
              {overview.sundays.map((s, i) => (
                <tr key={s.date} className="border-t border-line/70">
                  <td className={`px-4 py-2.5 ${i === 0 ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                    {fmt(s.date)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-ink">{s.attended}</td>
                  <td className="px-4 py-2.5 text-right text-hifmuted">{s.roster}</td>
                  <td className="px-4 py-2.5 text-right text-ink-2">{s.rate}%</td>
                </tr>
              ))}
              {overview.sundays.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-hifmuted">
                    No sessions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="border-t border-line px-4 py-2.5 text-xs text-hifmuted">
            Roster is counted as it stood on each date, from the enrolment history — not
            today&rsquo;s number applied backwards.
          </p>
        </section>
      </div>

      {/* Needs a look */}
      <section className="rounded-card border border-line bg-paper shadow-sm">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-semibold text-ink">Needs a look</h2>
        </div>
        <ul>
          {overview.concerns.map((c, i) => (
            <li key={i} className="flex items-center gap-3 border-b border-line/70 px-4 py-3 last:border-0">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  c.kind === 'blocker' ? 'bg-alert-soft text-alert-deep' : 'bg-flag-soft text-flag'
                }`}
              >
                {c.kind === 'blocker' ? '!' : '?'}
              </span>
              <span className="flex-1 text-sm text-ink">
                <b>{c.headline}</b> {c.detail}
              </span>
              <span className="hidden text-xs text-hifmuted sm:block">{c.meta}</span>
            </li>
          ))}
          {overview.concerns.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-hifmuted">Nothing outstanding.</li>
          )}
        </ul>
      </section>
    </Shell>
  )
}

function Card({
  label, value, foot,
}: {
  label: string
  value: number
  foot: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-line bg-paper px-4 py-3.5 shadow-sm">
      <div className="text-[11px] font-bold uppercase tracking-wider text-hifmuted">{label}</div>
      <div className="my-1 text-3xl font-bold tracking-tight text-ink">{value}</div>
      <div className="text-xs text-hifmuted">{foot}</div>
    </div>
  )
}
