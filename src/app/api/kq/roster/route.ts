/**
 * GET /api/kq/roster?sessionId=123
 *
 * The register for one room. Polled by the station on open and on reconnect.
 */

import { NextRequest, NextResponse } from 'next/server'

import { getKqUser, canWorkSession } from '@/lib/kq/auth'
import { getRoster, getSession } from '@/lib/kq/station'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getKqUser(req.headers)
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const sessionId = parseInt(req.nextUrl.searchParams.get('sessionId') ?? '', 10)
  if (Number.isNaN(sessionId)) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  if (!(await canWorkSession(user, sessionId))) {
    return NextResponse.json({ error: 'You are not rostered to this room' }, { status: 403 })
  }

  const [session, roster] = await Promise.all([getSession(sessionId), getRoster(sessionId)])
  if (!session) return NextResponse.json({ error: 'No such session' }, { status: 404 })

  return NextResponse.json({
    session,
    roster,
    you: { id: user.id, name: user.name, role: user.role },
  })
}
