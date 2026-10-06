import Link from 'next/link'
import { redirect } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import configPromise from '@payload-config'

import Shell from '@/components/kq/Shell'
import { getKqUser } from '@/lib/kq/auth'
import { getPool } from '@/lib/db'
import { upcomingSunday } from '@/lib/kq/station'

export const dynamic = 'force-dynamic'

/**
 * Home.
 *
 * This page did not exist, which meant /kq was a 404 and there was nothing in
 * the app that looked like a beginning. Ate had to remember /kq/dashboard, and
 * a bookmark that lost its path landed on nothing.
 *
 * It is not a second dashboard. It answers one question, "what am I here to
 * do", with the answer depending on who is asking: a teacher wants her room,
 * an administrator wants the five places she works.
 */
export default async function KqHome() {
  const headers = await nextHeaders()
  const user = await getKqUser(headers)

  // A site administrator may hold no ministry role, so getKqUser alone would
  // turn away the person who owns the thing.
  const payload = await getPayload({ config: configPromise })
  const { user: raw } = await payload.auth({ headers })
  const siteAdmin = (raw as { siteAdmin?: boolean } | null)?.siteAdmin === true

  if (!user && !siteAdmin) redirect('/kq/login?redirect=/kq')

  const role = user?.role ?? 'admin'
  const isAdmin = role === 'admin' || siteAdmin
  const name = user?.name ?? raw?.email ?? 'Administrator'

  const sunday = upcomingSunday()
  const pretty = new Date(sunday + 'T00:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
  })

  // Rooms this person is rostered to, for the Sunday coming. Only sessions
  // that have actually been opened appear here, so an empty list is normal
  // early on a Sunday rather than a sign that nobody was assigned.
  const myRooms = user
    ? (
        await getPool().query<{ id: string; label: string }>(
          `select s.id::text as id, g.label
             from kq.session_staff ss
             join kq.sessions s on s.id = ss.session_id
             join kq.groups g on g.code = s.group_code
            where ss.staff_user_id = $1 and s.service_date = $2
            order by g.sort_order`,
          [user.id, sunday],
        )
      ).rows
    : []

  return (
    <Shell current="/kq" user={{ name, role }}>
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Hello{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-0.5 text-sm text-hifmuted">Next service is {pretty}.</p>
      </header>

      {/* Rostered rooms first, because on a Sunday morning that is the only
          thing anybody opens this app to reach. */}
      {myRooms.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-hifmuted">
            Your room{myRooms.length > 1 ? 's' : ''} this Sunday
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {myRooms.map((r) => (
              <Link
                key={r.id}
                href={`/kq/station/${r.id}`}
                className="kq-tap flex items-center gap-3 rounded-card border border-brand/40 bg-brand-soft px-4 py-4 transition hover:border-brand"
              >
                <span className="flex-1">
                  <span className="block text-lg font-semibold text-ink">{r.label}</span>
                  <span className="block text-sm text-[#14536b]">Check in and dismiss</span>
                </span>
                <span className="text-xl text-brand-dark">→</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-hifmuted">
          {isAdmin ? 'Everything else' : 'Elsewhere'}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Tile
            href="/kq/station"
            title="Take attendance"
            body={
              myRooms.length > 0
                ? 'All the rooms, if you need to cover another one.'
                : 'Pick a room and start checking children in.'
            }
            sunday
          />
          <Tile
            href="/kq/register"
            title="Register"
            body="Who came, Sunday by Sunday. Tap a square to correct a mistake."
            sunday
          />

          {isAdmin && (
            <>
              <Tile
                href="/kq/dashboard"
                title="Dashboard"
                body="Numbers for the last few Sundays, and anything that needs a look."
              />
              <Tile
                href="/kq/kids"
                title="Children"
                body="The register itself. Add a child, fix a detail, or archive somebody who has left."
              />
              <Tile
                href="/kq/teachers"
                title="Rota: teachers"
                body="Who is teaching in which room this Sunday."
              />
              <Tile
                href="/kq/assistants"
                title="Rota: assistants"
                body="Who is assisting in which room this Sunday."
              />
              <Tile
                href="/kq/people"
                title="Volunteers and logins"
                body="Add a teacher or an assistant, change what they do, or stop an account. This is where a new login is made."
              />
            </>
          )}
        </div>
      </section>

      {!isAdmin && (
        <p className="mt-6 text-sm leading-relaxed text-hifmuted">
          If a room you expected is missing, or a child is not on your list, the
          KidzQuest administrator can sort it out. Nothing you do here can break
          anything, so have a look around.
        </p>
      )}
    </Shell>
  )
}

function Tile({
  href, title, body, sunday,
}: {
  href: string
  title: string
  body: string
  sunday?: boolean
}) {
  return (
    <Link
      href={href}
      className="kq-tap flex flex-col rounded-card border border-line bg-paper px-4 py-3.5 shadow-sm transition hover:border-brand"
    >
      <span className="flex items-center gap-2">
        <span className="flex-1 text-[15px] font-semibold text-ink">{title}</span>
        {sunday && (
          <span className="rounded-full bg-mist px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-hifmuted">
            SUN
          </span>
        )}
      </span>
      <span className="mt-1 text-sm leading-snug text-hifmuted">{body}</span>
    </Link>
  )
}
