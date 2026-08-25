/**
 * POST /api/kq/register
 *
 * Register a child who is not on any register.
 *
 * Open to teachers and assistants as well as admins: they are the ones standing
 * at the door when an unexpected family arrives, and routing that through an
 * administrator means the child cannot be checked in at all.
 *
 * A station registration must be for a room the caller actually works, which is
 * the same rule check-in already follows.
 */

import { NextRequest, NextResponse } from 'next/server'

import { canWorkSession, getKqUser } from '@/lib/kq/auth'
import { registerChild } from '@/lib/kq/children'
import { getSession } from '@/lib/kq/station'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getKqUser(req.headers)
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed body' }, { status: 400 })
  }

  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  if (!firstName) {
    return NextResponse.json({ error: 'A first name is required' }, { status: 400 })
  }

  const sessionId = body.sessionId ? Number(body.sessionId) : null
  let groupCode = String(body.groupCode ?? '').trim()
  const origin: 'station' | 'admin' = sessionId ? 'station' : 'admin'

  if (sessionId) {
    // The room comes from the session, not the request — otherwise a TA could
    // register a child into somebody else's class by editing the payload.
    const session = await getSession(sessionId)
    if (!session) return NextResponse.json({ error: 'No such session' }, { status: 404 })
    if (!(await canWorkSession(user, sessionId))) {
      return NextResponse.json({ error: 'You are not rostered to this room' }, { status: 403 })
    }
    groupCode = session.groupCode
  } else if (user.role !== 'admin') {
    // Adding a child outside a session is roster management, not a door
    // decision, so it stays with administrators.
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  if (!groupCode) {
    return NextResponse.json({ error: 'A group is required' }, { status: 400 })
  }

  try {
    const { childId } = await registerChild(
      {
        firstName,
        lastName,
        groupCode,
        gender: body.gender ? String(body.gender) : null,
        allergies: body.allergies ? String(body.allergies).trim() : null,
        guardianName: body.guardianName ? String(body.guardianName).trim() : null,
        guardianPhone: body.guardianPhone ? String(body.guardianPhone).trim() : null,
        guardianEmail: body.guardianEmail
          ? String(body.guardianEmail).trim().toLowerCase()
          : null,
      },
      user.id,
      origin,
    )
    return NextResponse.json({ ok: true, childId })
  } catch (e) {
    console.error('[kq/register]', e)
    return NextResponse.json({ error: 'Something went wrong. Nothing was saved.' }, { status: 500 })
  }
}
