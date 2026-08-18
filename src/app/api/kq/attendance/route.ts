/**
 * POST /api/kq/attendance
 *
 * One endpoint, two actions — check_in and check_out. They share the same
 * authorisation and the same failure handling, and keeping them together means
 * the station has one queue to drain when it comes back online rather than two
 * that could drain out of order.
 *
 * Body:
 *   { action: 'check_in',  sessionId, childId, guardianId, clientUuid, stationId? }
 *   { action: 'check_out', sessionId, childId, guardianId?, override?,
 *     overrideReason?, collectorName?, stationId? }
 */

import { NextRequest, NextResponse } from 'next/server'

import { getKqUser, canWorkSession, canOverride } from '@/lib/kq/auth'
import { checkIn, checkOut, CheckOutRefused } from '@/lib/kq/station'

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

  const sessionId = Number(body.sessionId)
  const childId = Number(body.childId)
  if (!sessionId || !childId) {
    return NextResponse.json({ error: 'sessionId and childId required' }, { status: 400 })
  }

  if (!(await canWorkSession(user, sessionId))) {
    return NextResponse.json({ error: 'You are not rostered to this room' }, { status: 403 })
  }

  const stationId = typeof body.stationId === 'string' ? body.stationId : null
  const guardianId = body.guardianId == null ? null : Number(body.guardianId)

  try {
    if (body.action === 'check_in') {
      if (typeof body.clientUuid !== 'string' || !body.clientUuid) {
        // Without this the station cannot safely retry, and a dropped response
        // becomes a second check-in for the same child.
        return NextResponse.json({ error: 'clientUuid required' }, { status: 400 })
      }

      const securityCode = await checkIn({
        sessionId, childId, guardianId,
        actorUserId: user.id,
        clientUuid: body.clientUuid,
        stationId,
      })
      return NextResponse.json({ ok: true, securityCode })
    }

    if (body.action === 'check_out') {
      const override = body.override === true
      if (override && !canOverride(user)) {
        return NextResponse.json(
          { error: 'A teacher or administrator must approve releasing a child to someone not on the list.' },
          { status: 403 },
        )
      }

      await checkOut({
        sessionId, childId, guardianId,
        actorUserId: user.id,
        override,
        overrideReason: typeof body.overrideReason === 'string' ? body.overrideReason : null,
        collectorName: typeof body.collectorName === 'string' ? body.collectorName : null,
        stationId,
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    // A refusal is an expected outcome the TA needs to read, not a server fault.
    if (e instanceof CheckOutRefused) {
      return NextResponse.json({ error: e.message }, { status: 409 })
    }
    console.error('[kq/attendance]', e)
    return NextResponse.json({ error: 'Something went wrong. Try again.' }, { status: 500 })
  }
}
