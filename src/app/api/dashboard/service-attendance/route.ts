import { NextRequest, NextResponse } from 'next/server'

import { getPool } from '@/lib/db'
import { getMeUser } from '@/utilities/getMeUser'

export const dynamic = 'force-dynamic'

/**
 * Records the adult headcount for one service.
 *
 * The one number no system holds. Kept to a single field because anything more
 * is a form somebody puts off until next week, and the monthly report already
 * shows what happens then — 55% empty, six months running.
 *
 * Auth is checked here rather than relying on a layout: route handlers have no
 * layout above them, and this writes to the database.
 */
export async function POST(req: NextRequest) {
  const { user } = await getMeUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { campus?: string; date?: string; adults?: unknown; kids?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { campus, date } = body
  if (!campus || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'campus and date (YYYY-MM-DD) are required' }, { status: 400 })
  }

  // A blank field clears the count rather than writing 0 — "not counted" and
  // "nobody came" are different facts and the schema keeps them apart.
  const parse = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : NaN
  }

  const adults = parse(body.adults)
  const kids = parse(body.kids)
  if (Number.isNaN(adults) || Number.isNaN(kids)) {
    return NextResponse.json({ error: 'Counts must be whole numbers, or blank' }, { status: 400 })
  }
  if ((adults ?? 0) > 10_000 || (kids ?? 0) > 10_000) {
    return NextResponse.json({ error: 'That looks like a typo — over 10,000' }, { status: 400 })
  }

  const pool = getPool()
  const { rows } = await pool.query(
    `insert into ops.service_attendance
       (campus, service_date, adults, kids, kids_source, recorded_by)
     values ($1, $2, $3, $4, case when $4::int is null then 'unknown' else 'counted' end, $5)
     on conflict (campus, service_date) do update set
       adults      = excluded.adults,
       kids        = coalesce(excluded.kids, ops.service_attendance.kids),
       -- Only claim the figure was counted by a person when one was supplied;
       -- otherwise leave whatever KidsQuest provided.
       kids_source = case when excluded.kids is not null then 'counted'
                         else ops.service_attendance.kids_source end,
       recorded_by = excluded.recorded_by,
       updated_at  = now()
     returning campus, service_date::text, adults, kids, kids_source, total`,
    [campus, date, adults, kids, user.email ?? 'dashboard'],
  )

  return NextResponse.json({ ok: true, service: rows[0] })
}
