/**
 * KidzQuest station — data access for Sunday check-in and check-out.
 *
 * Plain SQL against the `kq` schema, using the same pool as the analytics syncs
 * rather than Payload's ORM. Different reason from the syncs, though: they go
 * direct for bulk throughput, this goes direct because `kq` lives outside the
 * schemas Payload manages at all.
 *
 * Everything that mutates attendance also appends to kq.attendance_events in
 * the same transaction. If the event log write fails, the state change rolls
 * back with it — a check-out with no record of who collected the child is
 * worse than a check-out that didn't happen.
 */

import type { PoolClient } from 'pg'

import { getPool } from '../db'

// ── Security codes ───────────────────────────────────────────────────────────

/**
 * No B/8, S/5, G/6, O/0, I/1/L, U/V, Z/2.
 *
 * These get read aloud across a noisy room by Vietnamese, Korean, Filipino and
 * English speakers, and matched against a printed tag by someone holding a
 * toddler. Ambiguity between characters costs more than the extra entropy of a
 * fuller alphabet buys — 21³ is 9,261 combinations against a room of forty.
 */
const CODE_ALPHABET = 'ACDEFHJKMNPRTWXY34679'

const newCode = () =>
  Array.from({ length: 3 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('')

// ── Types ────────────────────────────────────────────────────────────────────

export type RosterChild = {
  childId: number
  firstName: string
  lastName: string
  preferredName: string | null
  allergies: string | null
  provisional: boolean
  attendanceId: number | null
  status: 'expected' | 'present' | 'checked_out' | 'absent'
  securityCode: string | null
  checkedInAt: string | null
  checkedOutAt: string | null
  guardians: Guardian[]
}

export type Guardian = {
  id: number
  fullName: string
  relationship: string | null
  canPickup: boolean
  isPrimary: boolean
  phone: string | null
}

export type SessionInfo = {
  id: number
  serviceDate: string
  groupCode: string
  groupLabel: string
  room: string | null
  openedAt: string | null
  closedAt: string | null
}

// ── Sessions ─────────────────────────────────────────────────────────────────

/** The Sunday a station should open on: today if it is Sunday, else the next one. */
export function upcomingSunday(from = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7))
  return d.toISOString().slice(0, 10)
}

/**
 * Find or create the session for a group on a date.
 *
 * Idempotent: two TAs opening the same room on two tablets must land on one
 * session, not two. The unique index on (service_date, group_code, campus_id)
 * enforces that; ON CONFLICT makes it quiet rather than an error someone has to
 * interpret at 9am.
 */
export async function openSession(
  serviceDate: string,
  groupCode: string,
  campusId: number | null = null,
): Promise<SessionInfo> {
  const db = getPool()
  const { rows } = await db.query<{
    id: string; service_date: Date; group_code: string; label: string
    room: string | null; opened_at: Date | null; closed_at: Date | null
  }>(
    // Conflict target matches kq_sessions_unique, which indexes
    // coalesce(campus_id, 0). Targeting campus_id directly never matched when
    // it was NULL, so every visit created another session for the same room.
    `with upsert as (
       insert into kq.sessions (service_date, group_code, campus_id, opened_at)
       values ($1, $2, $3, now())
       on conflict (service_date, group_code, (coalesce(campus_id, 0)))
         do update set opened_at = coalesce(kq.sessions.opened_at, now())
       returning *
     )
     select u.id, u.service_date, u.group_code, g.label, u.room, u.opened_at, u.closed_at
       from upsert u join kq.groups g on g.code = u.group_code`,
    [serviceDate, groupCode, campusId],
  )

  const r = rows[0]!
  return {
    id: parseInt(r.id, 10),
    serviceDate: r.service_date.toISOString().slice(0, 10),
    groupCode: r.group_code,
    groupLabel: r.label,
    room: r.room,
    openedAt: r.opened_at?.toISOString() ?? null,
    closedAt: r.closed_at?.toISOString() ?? null,
  }
}

export async function getSession(sessionId: number): Promise<SessionInfo | null> {
  const { rows } = await getPool().query<{
    id: string; service_date: Date; group_code: string; label: string
    room: string | null; opened_at: Date | null; closed_at: Date | null
  }>(
    `select s.id, s.service_date, s.group_code, g.label, s.room, s.opened_at, s.closed_at
       from kq.sessions s join kq.groups g on g.code = s.group_code
      where s.id = $1`,
    [sessionId],
  )
  const r = rows[0]
  if (!r) return null
  return {
    id: parseInt(r.id, 10),
    serviceDate: r.service_date.toISOString().slice(0, 10),
    groupCode: r.group_code,
    groupLabel: r.label,
    room: r.room,
    openedAt: r.opened_at?.toISOString() ?? null,
    closedAt: r.closed_at?.toISOString() ?? null,
  }
}

// ── Roster ───────────────────────────────────────────────────────────────────

/**
 * Every child expected in this room, with their attendance state and the adults
 * on file for them.
 *
 * Two queries rather than one join, because a join would repeat each child once
 * per guardian and the row count matters when a TA is refreshing this on a phone
 * over patchy wifi. Forty children and eighty guardians is two small payloads.
 */
export async function getRoster(sessionId: number): Promise<RosterChild[]> {
  const db = getPool()

  const { rows } = await db.query<{
    child_id: string; first_name: string; last_name: string
    preferred_name: string | null; allergies: string | null; provisional: boolean
    attendance_id: string | null; status: string | null; security_code: string | null
    checked_in_at: Date | null; checked_out_at: Date | null
  }>(
    `select r.child_id, r.first_name, r.last_name, r.preferred_name,
            r.allergies, r.provisional,
            a.id as attendance_id, a.status, a.security_code,
            a.checked_in_at, a.checked_out_at
       from kq.current_roster r
       left join kq.attendance a
              on a.child_id = r.child_id and a.session_id = $1
      where r.group_code = (select group_code from kq.sessions where id = $1)
      order by lower(coalesce(r.preferred_name, r.first_name)), lower(r.last_name)`,
    [sessionId],
  )

  if (rows.length === 0) return []

  const ids = rows.map((r) => parseInt(r.child_id, 10))
  const { rows: gRows } = await db.query<{
    child_id: string; id: string; full_name: string
    relationship: string | null; can_pickup: boolean; is_primary: boolean
    phone: string | null
  }>(
    `select cg.child_id, g.id, g.full_name, cg.relationship,
            cg.can_pickup, cg.is_primary, coalesce(g.e164, g.phone) as phone
       from kq.child_guardians cg
       join kq.guardians g on g.id = cg.guardian_id
      where cg.child_id = any($1::bigint[])
      order by cg.is_primary desc, g.full_name`,
    [ids],
  )

  const byChild = new Map<number, Guardian[]>()
  for (const g of gRows) {
    const k = parseInt(g.child_id, 10)
    if (!byChild.has(k)) byChild.set(k, [])
    byChild.get(k)!.push({
      id: parseInt(g.id, 10),
      fullName: g.full_name,
      relationship: g.relationship,
      canPickup: g.can_pickup,
      isPrimary: g.is_primary,
      phone: g.phone,
    })
  }

  return rows.map((r) => ({
    childId: parseInt(r.child_id, 10),
    firstName: r.first_name,
    lastName: r.last_name,
    preferredName: r.preferred_name,
    allergies: r.allergies,
    provisional: r.provisional,
    attendanceId: r.attendance_id ? parseInt(r.attendance_id, 10) : null,
    status: (r.status as RosterChild['status']) ?? 'expected',
    securityCode: r.security_code,
    checkedInAt: r.checked_in_at?.toISOString() ?? null,
    checkedOutAt: r.checked_out_at?.toISOString() ?? null,
    guardians: byChild.get(parseInt(r.child_id, 10)) ?? [],
  }))
}

// ── Mutations ────────────────────────────────────────────────────────────────

async function logEvent(
  client: PoolClient,
  attendanceId: number,
  eventType: string,
  actorUserId: number | null,
  guardianId: number | null,
  detail: Record<string, unknown>,
  stationId: string | null,
) {
  await client.query(
    `insert into kq.attendance_events
       (attendance_id, event_type, actor_user_id, guardian_id, detail, station_id)
     values ($1,$2,$3,$4,$5,$6)`,
    [attendanceId, eventType, actorUserId, guardianId, JSON.stringify(detail), stationId],
  )
}

export type CheckInArgs = {
  sessionId: number
  childId: number
  guardianId: number | null
  actorUserId: number
  clientUuid: string
  stationId?: string | null
}

/**
 * Check a child in.
 *
 * Idempotent on clientUuid. If the network drops between the write and the
 * response, the station retries with the same uuid and gets the original row
 * back — including the same security code, which matters because it is already
 * printed on a label in a parent's hand.
 */
export async function checkIn(
  args: CheckInArgs,
): Promise<{ attendanceId: number; securityCode: string | null }> {
  const db = getPool()
  const client = await db.connect()

  try {
    await client.query('begin')

    const existing = await client.query<{ id: string; security_code: string }>(
      `select id, security_code from kq.attendance where client_uuid = $1`,
      [args.clientUuid],
    )
    if (existing.rows[0]) {
      await client.query('commit')
      // A retry returns the ORIGINAL code, never a fresh one — the first is
      // already printed and in a parent's hand.
      return {
        attendanceId: parseInt(existing.rows[0].id, 10),
        securityCode: existing.rows[0].security_code,
      }
    }

    // Retry on a code collision rather than widening the alphabet. With 9,261
    // codes against a room of forty, a second attempt is overwhelmingly enough.
    let code = ''
    let attendanceId = 0
    for (let attempt = 0; attempt < 8; attempt++) {
      code = newCode()
      try {
        const { rows } = await client.query<{ id: string }>(
          `insert into kq.attendance
             (session_id, child_id, source, security_code, status,
              checked_in_at, checked_in_by_user, checked_in_guardian, client_uuid)
           values ($1,$2,'station',$3,'present',now(),$4,$5,$6)
           on conflict (session_id, child_id) do update
             set status              = 'present',
                 checked_in_at       = coalesce(kq.attendance.checked_in_at, now()),
                 checked_in_by_user  = excluded.checked_in_by_user,
                 checked_in_guardian = excluded.checked_in_guardian,
                 security_code       = coalesce(kq.attendance.security_code, excluded.security_code),
                 client_uuid         = coalesce(kq.attendance.client_uuid, excluded.client_uuid)
           returning id, security_code`,
          [args.sessionId, args.childId, code, args.actorUserId, args.guardianId, args.clientUuid],
        )
        attendanceId = parseInt(rows[0]!.id, 10)
        code = (rows[0] as unknown as { security_code: string }).security_code
        break
      } catch (e) {
        const pgCode = (e as { code?: string }).code
        if (pgCode === '23505' && attempt < 7) continue    // duplicate code, try again
        throw e
      }
    }

    await logEvent(client, attendanceId, 'check_in', args.actorUserId, args.guardianId,
      { securityCode: code }, args.stationId ?? null)

    await client.query('commit')
    return { attendanceId, securityCode: code }
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}

export type CheckOutArgs = {
  sessionId: number
  childId: number
  guardianId: number | null
  actorUserId: number
  /** Set when releasing to someone not on the authorised list. */
  override?: boolean
  overrideReason?: string | null
  /** Free-text name when the collector is not a recorded guardian. */
  collectorName?: string | null
  stationId?: string | null
}

export class CheckOutRefused extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CheckOutRefused'
  }
}

/**
 * Check a child out.
 *
 * The authorisation is kq.child_guardians.can_pickup — NOT the security code.
 * A matching code is convenience; if it were sufficient, a printed label would
 * become a bearer token for a child. Releasing to anyone without can_pickup is
 * an override, and an override without a stated reason is refused here as well
 * as by the CHECK constraint.
 */
export async function checkOut(args: CheckOutArgs): Promise<void> {
  const db = getPool()
  const client = await db.connect()

  try {
    await client.query('begin')

    const { rows } = await client.query<{ id: string; status: string }>(
      `select id, status from kq.attendance
        where session_id = $1 and child_id = $2 for update`,
      [args.sessionId, args.childId],
    )
    const att = rows[0]
    if (!att) throw new CheckOutRefused('That child has not been checked in.')
    if (att.status === 'checked_out') throw new CheckOutRefused('That child has already been collected.')

    let authorised = false
    if (args.guardianId) {
      const { rows: ok } = await client.query<{ can_pickup: boolean }>(
        `select can_pickup from kq.child_guardians
          where child_id = $1 and guardian_id = $2`,
        [args.childId, args.guardianId],
      )
      authorised = ok[0]?.can_pickup === true
    }

    if (!authorised) {
      if (!args.override) throw new CheckOutRefused('That adult is not authorised to collect this child.')
      if (!args.overrideReason?.trim()) throw new CheckOutRefused('An override needs a reason.')
    }

    const attendanceId = parseInt(att.id, 10)

    await client.query(
      `update kq.attendance
          set status               = 'checked_out',
              checked_out_at       = now(),
              checked_out_by_user  = $2,
              checked_out_guardian = $3,
              checkout_override    = $4,
              checkout_reason      = $5
        where id = $1`,
      [attendanceId, args.actorUserId, args.guardianId,
       !authorised, !authorised ? args.overrideReason!.trim() : null],
    )

    await logEvent(client, attendanceId, authorised ? 'check_out' : 'override',
      args.actorUserId, args.guardianId,
      {
        authorised,
        collectorName: args.collectorName ?? null,
        reason: !authorised ? args.overrideReason?.trim() ?? null : null,
      },
      args.stationId ?? null)

    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
}

// ── Who is still here ────────────────────────────────────────────────────────

/** Children checked in and not yet collected. The end-of-service question. */
export async function stillPresent(sessionId: number): Promise<{ childId: number; name: string }[]> {
  const { rows } = await getPool().query<{ child_id: string; name: string }>(
    `select a.child_id,
            coalesce(c.preferred_name, c.first_name) || ' ' || c.last_name as name
       from kq.attendance a
       join kq.children c on c.id = a.child_id
      where a.session_id = $1 and a.status = 'present'
      order by 2`,
    [sessionId],
  )
  return rows.map((r) => ({ childId: parseInt(r.child_id, 10), name: r.name }))
}
