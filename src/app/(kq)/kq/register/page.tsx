import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'

import Shell from '@/components/kq/Shell'
import { getKqUser } from '@/lib/kq/auth'
import { getRegister } from '@/lib/kq/register'

import RegisterGrid from './RegisterGrid'

export const dynamic = 'force-dynamic'

/**
 * How many Sundays to show stays in the URL, so a link points at what somebody
 * is actually looking at. Group, grade, sex and attendance filter inside the
 * grid, because they combine and re-fetching the server on every dropdown
 * change would make the page feel broken.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ weeks?: string }>
}) {
  const user = await getKqUser(await nextHeaders())
  if (!user) redirect('/admin/login?redirect=/kq/register')

  const { weeks: weeksParam } = await searchParams
  const weeks = weeksParam === 'all' ? 0 : Math.max(4, parseInt(weeksParam ?? '12', 10) || 12)

  const { dates, rows, perDate, totalSundays } = await getRegister(null, weeks)

  const shortDate = (iso: string) =>
    new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', timeZone: 'UTC',
    })

  return (
    <Shell current="/kq/register" user={{ name: user.name ?? user.email, role: user.role }}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Register</h1>
          <p className="mt-0.5 text-sm text-hifmuted">
            {rows.length} children · {dates.length} of {totalSundays} Sundays
            {dates.length > 0 &&
              ` · ${shortDate(dates[0]!)} to ${shortDate(dates[dates.length - 1]!)}`}
          </p>
        </div>

        <span className="flex items-center gap-1.5">
          {([8, 12, 20] as const).map((w) => (
            <Link
              key={w}
              href={`/kq/register?weeks=${w}`}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                weeks === w ? 'bg-brand-dark text-white' : 'bg-mist text-ink-2 hover:brightness-95'
              }`}
            >
              {w} weeks
            </Link>
          ))}
          <Link
            href="/kq/register?weeks=all"
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              weeks === 0 ? 'bg-brand-dark text-white' : 'bg-mist text-ink-2 hover:brightness-95'
            }`}
          >
            All
          </Link>
        </span>
      </header>

      <RegisterGrid
        dates={dates}
        rows={rows}
        perDate={perDate}
        canEdit={user.role === 'admin'}
      />
    </Shell>
  )
}
