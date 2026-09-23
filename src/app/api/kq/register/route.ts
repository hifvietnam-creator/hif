/**
 * PATCH /api/kq/register
 *
 * Corrects a past Sunday. Administrators only.
 *
 * The case: a helper marked a child present who never arrived, or forgot one
 * who did. Ate needs to put it right weeks later.
 *
 *   { childId, date, present: boolean }
 *
 * NOTHING IS EVER DELETED.
 *
 * Marking a child absent flips the status and leaves the row intact — the
 * check-in time, the adult who dropped them off, the collection. Those are the
 * record of a child being handed over, and they must survive somebody deciding
 * the attendance was wrong. Every change writes to kq.attendance_events with
 * the name of whoever made it.
 */

import { NextRequest, NextResponse } from 'next/server'

import { getKqUser } from '@/lib/kq/auth'
import { getPool } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const user = await getKqUser(req.headers)
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  if (user.role !== 'admin') {
    return NextResponse.json({ error: 'Administrators only' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed body' }, { status: 400 })
  }

  const childId = Number(body.childId)
  const date = String(body.date ?? '')
  const present = body.present === true

  if (!childId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'childId and date required' }, { status: 400 })
  }

  const db = getPool()
  const client = await db.connect()

  try {
    await client.query('begin')

    // The session for the group this child is in now. A correction to a Sunday
    // months ago files under their current room, which is a small inaccuracy
    // accepted deliberately: the alternative is asking Ate which room a child
    // was in last May, which she has no way of knowing either.
    const { rows: enrol } = await client.query<{ group_code: string }>(
      `select group_code from kq.enrollments
        where child_id = $1 and ended_on is null
        order by started_on desc limit 1`,
      [childId],
    )
    if (!enrol[0]) {
      await client.query('rollback')
      return NextResponse.json({ error: 'That child is not on any register' }, { status: 400 })
    }

    const { rows: session } = await client.query<{ id: string }>(
      `insert into kq.sessions (service_date, group_code) values ($1,$2)
       on conflict (service_date, group_code, (coalesce(campus_id, 0)))
         do update set service_date = excluded.service_date
       returning id`,
      [date, enrol[0].group_code],
    )
    const sessionId = parseInt(session[0]!.id, 10)

    const { rows: existing } = await client.query<{ id: string; status: string; source: string }>(
      `select id, status, source from kq.attendance
        where session_id = $1 and child_id = $2 for update`,
      [sessionId, childId],
    )

    let attendanceId: number
    let from: string

    if (existing[0]) {
      from = existing[0].status
      attendanceId = parseInt(existing[0].id, 10)
      // Status only. checked_in_at, the guardian and the check-out all stay.
      await client.query(
        `update kq.attendance set status = $2 where id = $1`,
        [attendanceId, present ? 'present' : 'absent'],
      )
    } else {
      from = 'no record'
      const { rows } = await client.query<{ id: string }>(
        `insert into kq.attendance (session_id, child_id, status, source)
         values ($1,$2,$3,'correction') returning id`,
        [sessionId, childId, present ? 'present' : 'absent'],
      )
      attendanceId = parseInt(rows[0]!.id, 10)
    }

    await client.query(
      `insert into kq.attendance_events
         (attendance_id, event_type, actor_user_id, detail)
       values ($1,'note',$2,$3)`,
      [attendanceId, user.id, JSON.stringify({
        correction: true, date, from, to: present ? 'present' : 'absent',
      })],
    )

    await client.query('commit')
    return NextResponse.json({ ok: true, status: present ? 'present' : 'absent' })
  } catch (e) {
    await client.query('rollback')
    console.error('[kq/register]', e)
    return NextResponse.json({ error: 'Something went wrong. Nothing was saved.' }, { status: 500 })
  } finally {
    client.release()
  }
}
