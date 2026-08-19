/**
 * Teachers and teaching assistants — who is serving, where, and when.
 *
 * Staff identity lives in Payload's `users` table; where they serve lives in
 * kq.session_staff. The two are joined by id with no foreign key, for the
 * reason migration 001 gives: Payload owns `public` and manages it through its
 * own adapter, so reaching into it with a constraint would couple our schema to
 * Payload's migrations.
 *
 * The practical consequence: a deleted Payload user leaves orphan rows here.
 * That is deliberate — losing the record of who was in a room on a given Sunday
 * would be worse than a dangling id, and the id is still enough to answer a
 * safeguarding question later.
 */

import { getPayload } from 'payload'
import configPromise from '@payload-config'

import { getPool } from '../db'
import { openSession } from './station'

export type StaffMember = {
  userId: number
  name: string
  email: string
  role: 'teacher' | 'ta'
  /** Group codes they are assigned to on the target Sunday. */
  assignedGroups: string[]
  /** Sundays served, ever. */
  sundaysServed: number
  lastServed: string | null
  /** Presence across the most recent Sundays, newest last. */
  recent: boolean[]
}

export async function listStaff(targetDate: string): Promise<StaffMember[]> {
  const payload = await getPayload({ config: configPromise })
  const db = getPool()

  const users = await payload.find({
    collection: 'users',
    where: { kqRole: { in: ['teacher', 'ta'] } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  })

  if (users.docs.length === 0) return []

  const ids = users.docs.map((u) => Number(u.id))

  // Assignments on the target Sunday.
  const { rows: assigned } = await db.query<{ staff_user_id: number; group_code: string }>(
    `select ss.staff_user_id, s.group_code
       from kq.session_staff ss
       join kq.sessions s on s.id = ss.session_id
      where s.service_date = $1 and ss.staff_user_id = any($2::int[])`,
    [targetDate, ids],
  )

  // Serving history, all time.
  const { rows: history } = await db.query<{
    staff_user_id: number; n: string; last_served: Date | null
  }>(
    `select ss.staff_user_id,
            count(distinct s.service_date)::text as n,
            max(s.service_date) as last_served
       from kq.session_staff ss
       join kq.sessions s on s.id = ss.session_id
      where ss.staff_user_id = any($1::int[])
      group by ss.staff_user_id`,
    [ids],
  )

  // The last eight Sundays we hold sessions for, oldest first for the dot strip.
  const { rows: dateRows } = await db.query<{ d: Date }>(
    `select distinct service_date as d from kq.sessions order by 1 desc limit 8`,
  )
  const recentDates = dateRows.map((r) => r.d.toISOString().slice(0, 10)).reverse()

  const { rows: presence } = await db.query<{ staff_user_id: number; d: Date }>(
    `select distinct ss.staff_user_id, s.service_date as d
       from kq.session_staff ss
       join kq.sessions s on s.id = ss.session_id
      where ss.staff_user_id = any($1::int[]) and s.service_date = any($2::date[])`,
    [ids, recentDates],
  )

  const assignedBy = new Map<number, string[]>()
  for (const a of assigned) {
    if (!assignedBy.has(a.staff_user_id)) assignedBy.set(a.staff_user_id, [])
    assignedBy.get(a.staff_user_id)!.push(a.group_code)
  }

  const historyBy = new Map(history.map((h) => [h.staff_user_id, h]))
  const presenceBy = new Set(
    presence.map((p) => `${p.staff_user_id}|${p.d.toISOString().slice(0, 10)}`),
  )

  return users.docs.map((u) => {
    const id = Number(u.id)
    const h = historyBy.get(id)
    return {
      userId: id,
      name: (u as { name?: string | null }).name ?? u.email,
      email: u.email,
      role: (u as { kqRole: 'teacher' | 'ta' }).kqRole,
      assignedGroups: assignedBy.get(id) ?? [],
      sundaysServed: h ? Number(h.n) : 0,
      lastServed: h?.last_served ? h.last_served.toISOString().slice(0, 10) : null,
      recent: recentDates.map((d) => presenceBy.has(`${id}|${d}`)),
    }
  })
}

/**
 * Put someone in a room for a given Sunday, creating the session if needed.
 *
 * openSession is idempotent, so assigning three people to Explorers creates one
 * session and three rows rather than three sessions.
 */
export async function assignStaff(
  serviceDate: string,
  groupCode: string,
  staffUserId: number,
  role: 'teacher' | 'ta',
): Promise<void> {
  const session = await openSession(serviceDate, groupCode)
  await getPool().query(
    `insert into kq.session_staff (session_id, staff_user_id, role)
     values ($1,$2,$3)
     on conflict (session_id, staff_user_id) do update set role = excluded.role`,
    [session.id, staffUserId, role],
  )
}

export async function unassignStaff(
  serviceDate: string,
  groupCode: string,
  staffUserId: number,
): Promise<void> {
  await getPool().query(
    `delete from kq.session_staff ss
      using kq.sessions s
      where ss.session_id = s.id
        and s.service_date = $1
        and s.group_code = $2
        and ss.staff_user_id = $3`,
    [serviceDate, groupCode, staffUserId],
  )
}
