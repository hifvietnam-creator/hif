import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'

import Shell from '@/components/kq/Shell'
import { getKqUser } from '@/lib/kq/auth'
import { getRegister, type CellState } from '@/lib/kq/register'

export const dynamic = 'force-dynamic'

/**
 * Everything here is driven by the URL, so the whole page stays a server
 * component. No client JavaScript, it prints properly, and Ate can send
 * somebody a link to exactly the view she is looking at.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; weeks?: string }>
}) {
  const user = await getKqUser(await nextHeaders())
  if (!user) redirect('/admin/login?redirect=/kq/register')

  const { group: groupParam, weeks: weeksParam } = await searchParams
  const group = groupParam && groupParam !== 'all' ? groupParam : null
  const weeks = weeksParam === 'all' ? 0 : Math.max(4, parseInt(weeksParam ?? '12', 10) || 12)

  const { dates, rows, perDate, groups, totalSundays } = await getRegister(group, weeks)

  const href = (g: string | null, w: number | 'all') =>
    `/kq/register?group=${g ?? 'all'}&weeks=${w}`

  const shortDate = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', timeZone: 'UTC',
    })

  return (
    <Shell current="/kq/register" user={{ name: user.name ?? user.email, role: user.role }}>
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Register</h1>
        <p className="mt-0.5 text-sm text-hifmuted">
          {rows.length} children · {dates.length} of {totalSundays} Sundays
          {dates.length > 0 && ` · ${shortDate(dates[0]!)} to ${shortDate(dates[dates.length - 1]!)}`}
        </p>
      </header>

      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tab href={href(null, weeks || 'all')} on={!group}>
          All groups
        </Tab>
        {groups.map((g) => (
          <Tab key={g.code} href={href(g.code, weeks || 'all')} on={group === g.code}>
            {g.label} <span className="opacity-60">{g.count}</span>
          </Tab>
        ))}

        <span className="ml-auto flex items-center gap-1.5">
          {([8, 12, 20] as const).map((w) => (
            <Tab key={w} href={href(group, w)} on={weeks === w} small>
              {w} weeks
            </Tab>
          ))}
          <Tab href={href(group, 'all')} on={weeks === 0} small>
            All
          </Tab>
        </span>
      </div>

      {/* Key. Without it the grid is just ticks and the distinctions are lost. */}
      <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-card border border-line bg-paper px-4 py-2.5 text-xs text-ink-2">
        <Legend state="paper">Marked on paper</Legend>
        <Legend state="station">Checked in and out</Legend>
        <Legend state="still_in">No check-out recorded</Legend>
        <Legend state="absent">Not there</Legend>
        <Legend state="not_yet">Not yet on the register</Legend>
      </div>

      <div className="overflow-auto rounded-card border border-line bg-paper shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-mist/70 text-[11px] text-hifmuted">
              <th className="sticky left-0 z-20 min-w-[180px] bg-mist px-3 py-2 text-left font-bold uppercase tracking-wider">
                Child
              </th>
              {!group && (
                <th className="min-w-[95px] px-2 py-2 text-left font-bold uppercase tracking-wider">
                  Group
                </th>
              )}
              {dates.map((d) => (
                <th key={d} className="min-w-[46px] px-1 py-2 text-center font-semibold">
                  {shortDate(d)}
                </th>
              ))}
              <th className="min-w-[64px] px-2 py-2 text-center font-bold uppercase tracking-wider">
                Came
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const pc = r.possible ? Math.round((r.present / r.possible) * 100) : 0
              return (
                <tr key={r.childId} className="border-t border-line/60">
                  <td className="sticky left-0 z-10 bg-paper px-3 py-1.5 font-medium text-ink">
                    {r.name}
                  </td>
                  {!group && (
                    <td className="px-2 py-1.5 text-xs text-hifmuted">{r.groupCode}</td>
                  )}
                  {r.cells.map((c, i) => (
                    <td key={i} className="px-1 py-1.5 text-center">
                      <Mark cell={c} date={dates[i]!} name={r.name} />
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center">
                    <span className="font-semibold text-ink">{r.present}</span>
                    <span className="ml-1 text-xs text-hifmuted">{pc}%</span>
                  </td>
                </tr>
              )
            })}

            {rows.length === 0 && (
              <tr>
                <td colSpan={dates.length + 3} className="px-4 py-12 text-center text-hifmuted">
                  Nobody on this register.
                </td>
              </tr>
            )}
          </tbody>

          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-line bg-mist/50 text-xs">
                <td className="sticky left-0 z-10 bg-mist px-3 py-2 font-bold uppercase tracking-wider text-hifmuted">
                  Total
                </td>
                {!group && <td />}
                {perDate.map((n, i) => (
                  <td key={i} className="px-1 py-2 text-center font-bold text-ink">
                    {n}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <p className="mt-3 text-xs text-hifmuted">
        Sundays before a child joined are left blank rather than counted as absences, so
        the percentage is out of the weeks they were actually with us.
      </p>
    </Shell>
  )
}

// ── Bits ─────────────────────────────────────────────────────────────────────

function Tab({
  href, on, children, small,
}: {
  href: string; on: boolean; children: React.ReactNode; small?: boolean
}) {
  return (
    <Link
      href={href}
      className={`rounded-full font-semibold transition ${small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${
        on ? 'bg-brand-dark text-white' : 'bg-mist text-ink-2 hover:brightness-95'
      }`}
    >
      {children}
    </Link>
  )
}

const MARK: Record<CellState, { glyph: string; cls: string; label: string }> = {
  paper:    { glyph: '✓', cls: 'text-ok-ink',            label: 'marked on paper' },
  station:  { glyph: '✓', cls: 'text-ok font-bold',      label: 'checked in and out' },
  still_in: { glyph: '!', cls: 'text-alert font-bold',   label: 'checked in, no check-out recorded' },
  absent:   { glyph: '·', cls: 'text-line',              label: 'not there' },
  not_yet:  { glyph: '',  cls: '',                       label: '' },
}

function Mark({ cell, date, name }: { cell: RegisterCellProp; date: string; name: string }) {
  const m = MARK[cell.state]
  if (cell.state === 'not_yet') {
    return <span className="block h-4 w-full rounded-sm bg-mist/60" title={`${name} had not joined yet`} />
  }
  const time = cell.checkedInAt
    ? new Date(cell.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : null
  return (
    <span
      className={m.cls}
      title={`${name} · ${date} · ${m.label}${time ? ` at ${time}` : ''}${
        cell.group ? ` (${cell.group})` : ''
      }`}
    >
      {m.glyph}
    </span>
  )
}

type RegisterCellProp = {
  state: CellState
  group: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
}

function Legend({ state, children }: { state: CellState; children: React.ReactNode }) {
  const m = MARK[state]
  return (
    <span className="flex items-center gap-1.5">
      {state === 'not_yet' ? (
        <span className="inline-block h-3.5 w-3.5 rounded-sm bg-mist/60 ring-1 ring-line" />
      ) : (
        <span className={`inline-block w-3.5 text-center ${m.cls}`}>{m.glyph}</span>
      )}
      {children}
    </span>
  )
}
