import { redirect, notFound } from 'next/navigation'
import { headers as nextHeaders } from 'next/headers'

import { getKqUser, canWorkSession, canOverride } from '@/lib/kq/auth'
import { getSession, getRoster } from '@/lib/kq/station'

import Station from './Station'

export const dynamic = 'force-dynamic'

export default async function StationPage({
  params,
}: {
  params: Promise<{ sessionId: string }>
}) {
  const { sessionId: raw } = await params
  const sessionId = parseInt(raw, 10)
  if (Number.isNaN(sessionId)) notFound()

  const user = await getKqUser(await nextHeaders())
  if (!user) redirect(`/admin/login?redirect=/kq/station/${sessionId}`)

  if (!(await canWorkSession(user, sessionId))) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-ink">Not your room</h1>
        <p className="mt-2 text-sm text-ink-2">
          You are not rostered to this session. Ask an administrator to add you,
          or go back and pick a room you are assigned to.
        </p>
        <a href="/kq/station" className="mt-6 inline-block font-semibold text-brand-dark underline">
          Back to rooms
        </a>
      </main>
    )
  }

  const session = await getSession(sessionId)
  if (!session) notFound()

  // Rendered on the server so the register is on screen before any JavaScript
  // runs. If the network dies immediately after load, the TA still has the list.
  const roster = await getRoster(sessionId)

  return (
    <Station
      session={session}
      initialRoster={roster}
      you={{ id: user.id, name: user.name ?? user.email, role: user.role }}
      mayOverride={canOverride(user)}
    />
  )
}
