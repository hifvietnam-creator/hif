/**
 * /api/cron/service-attendance
 *
 * Runs every Sunday evening. Opens a row for that day's services and fills in
 * everything that can be derived, so the only thing left is the one number a
 * machine cannot know.
 *
 * What it does:
 *   · creates a row per campus for today, if one does not exist
 *   · pulls the children's figure from KidsQuest check-ins
 *   · backfills children for recent Sundays whose register was completed late
 *
 * What it deliberately does not do:
 *   · invent an adult headcount. Nothing in any system holds it — it comes from
 *     a person counting. A scheduled job cannot produce it, and writing a zero
 *     or an estimate would be worse than leaving it blank, because a number
 *     nobody counted still looks like a number somebody counted.
 *
 * The row is created anyway so the gap is visible on the dashboard rather than
 * being an absence nobody notices.
 *
 * Authorization: Bearer <CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'

import { getPool } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Campuses that hold a Sunday service. */
const CAMPUSES = ['MyDinh', 'Ecopark', 'Thai Nguyen']

/** How far back to re-check KidsQuest, for registers completed after the fact. */
const BACKFILL_WEEKS = 6

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('begin')

    // Today in Vietnam. Running on UTC would put a Sunday-evening job into
    // Monday and open the row against the wrong date.
    const { rows: [{ today }] } = await client.query<{ today: string }>(
      `select (now() at time zone 'Asia/Ho_Chi_Minh')::date::text as today`,
    )

    const created: string[] = []
    for (const campus of CAMPUSES) {
      const res = await client.query(
        `insert into ops.service_attendance (campus, service_date, recorded_by, note)
         values ($1, $2, 'cron', 'Awaiting the adult count')
         on conflict (campus, service_date) do nothing
         returning id`,
        [campus, today],
      )
      if (res.rowCount) created.push(campus)
    }

    // Children, from KidsQuest. Applied to any recent Sunday still missing a
    // figure — a register finished on Tuesday should still land on Sunday's row.
    const kids = await client.query(
      `with counted as (
         select s.service_date,
                count(distinct a.child_id)::int as children
           from kq.sessions s
           join kq.attendance a on a.session_id = s.id
          where s.service_date >= $1::date - ($2 * 7)
          group by s.service_date
         having count(distinct a.child_id) > 0
       )
       update ops.service_attendance sa
          set kids = c.children,
              kids_source = 'kidsquest',
              updated_at = now()
         from counted c
        where sa.service_date = c.service_date
          -- Never overwrite a figure a human entered by hand: they were in the
          -- room and the register may be incomplete.
          and (sa.kids is null or sa.kids_source = 'kidsquest')
          and coalesce(sa.kids, -1) is distinct from c.children
        returning sa.campus, sa.service_date::text, sa.kids`,
      [today, BACKFILL_WEEKS],
    )

    const { rows: awaiting } = await client.query<{ campus: string; service_date: string }>(
      `select campus, service_date::text
         from ops.service_attendance
        where adults is null
          and service_date >= $1::date - 60
        order by service_date desc, campus`,
      [today],
    )

    await client.query('commit')

    return NextResponse.json({
      ok: true,
      date: today,
      rowsCreated: created,
      kidsUpdated: kids.rows,
      // Surfaced in the response so a monitoring glance shows the backlog
      // without anyone opening the dashboard.
      awaitingAdultCount: awaiting,
      note:
        'Adult counts are never generated. They are entered by whoever counted, ' +
        'and any Sunday listed above is still waiting for one.',
    })
  } catch (err) {
    await client.query('rollback')
    console.error('[Cron] service-attendance failed:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  } finally {
    client.release()
  }
}
