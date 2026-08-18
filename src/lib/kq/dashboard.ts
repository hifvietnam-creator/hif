/**
 * KidzQuest dashboard queries.
 *
 * All read-only, all against the `kq` schema. Two things worth knowing before
 * reading the SQL:
 *
 * 1. "Attended" means status IN ('present','checked_out'). A child who was
 *    checked in and collected attended; only 'expected' and 'absent' did not.
 *    Imported history is all 'present', because a spreadsheet tick records
 *    arrival and nothing else.
 *
 * 2. Roster size is historical, not current. The number of children on the
 *    register on 17 May is the number of enrolments open on 17 May — which is
 *    what kq.enrollments exists to answer. Using today's roster for every past
 *    Sunday would quietly rewrite the past every time a child joins.
 */

import { getPool } from '../db'

const ATTENDED = `a.status in ('present','checked_out')`

export type GroupRow = {
  code: string
  label: string
  roster: number
  attended: number
  provisional: number
}

export type SundayRow = {
  date: string
  attended: number
  roster: number
  rate: number
}

export type Concern = {
  kind: 'blocker' | 'check'
  headline: string
  detail: string
  meta: string
}

export type Overview = {
  latestSunday: string | null
  previousSunday: string | null
  attendedLatest: number
  attendedPrevious: number
  rosterNow: number
  groups: GroupRow[]
  sundays: SundayRow[]
  concerns: Concern[]
  provisionalTotal: number
}

/** Sundays we hold any session for, newest first. */
async function sessionDates(limit = 8): Promise<string[]> {
  const { rows } = await getPool().query<{ d: Date }>(
    `select distinct service_date as d from kq.sessions order by 1 desc limit $1`,
    [limit],
  )
  return rows.map((r) => r.d.toISOString().slice(0, 10))
}

export async function getOverview(): Promise<Overview> {
  const db = getPool()
  const dates = await sessionDates(8)
  const latest = dates[0] ?? null
  const previous = dates[1] ?? null

  // ── Recent Sundays ─────────────────────────────────────────────────────────
  // Roster is counted from enrolments open on that date, so a Sunday in May
  // reports the register as it stood in May.
  const { rows: sundayRows } = await db.query<{
    d: Date; attended: string; roster: string
  }>(
    `select s.service_date as d,
            count(a.id) filter (where ${ATTENDED})::text as attended,
            (select count(*) from kq.enrollments e
              where e.started_on <= s.service_date
                and (e.ended_on is null or e.ended_on >= s.service_date))::text as roster
       from kq.sessions s
       left join kq.attendance a on a.session_id = s.id
      group by s.service_date
      order by s.service_date desc
      limit 8`,
  )

  const sundays: SundayRow[] = sundayRows.map((r) => {
    const attended = Number(r.attended)
    const roster = Number(r.roster)
    return {
      date: r.d.toISOString().slice(0, 10),
      attended,
      roster,
      rate: roster ? Math.round((attended / roster) * 100) : 0,
    }
  })

  // ── By group ───────────────────────────────────────────────────────────────
  const { rows: groupRows } = await db.query<{
    code: string; label: string; roster: string; attended: string; provisional: string
  }>(
    `select g.code, g.label,
            (select count(*) from kq.current_roster r
              where r.group_code = g.code)::text as roster,
            (select count(*) from kq.attendance a
               join kq.sessions s on s.id = a.session_id
              where s.group_code = g.code
                and s.service_date = $1
                and ${ATTENDED})::text as attended,
            (select count(*) from kq.current_roster r
              where r.group_code = g.code and r.provisional)::text as provisional
       from kq.groups g
      where g.active and g.code <> 'aftershock'
      order by g.sort_order`,
    [latest],
  )

  const groups: GroupRow[] = groupRows.map((r) => ({
    code: r.code,
    label: r.label,
    roster: Number(r.roster),
    attended: Number(r.attended),
    provisional: Number(r.provisional),
  }))

  const { rows: nowRows } = await db.query<{ n: string; prov: string }>(
    `select count(*)::text as n,
            count(*) filter (where provisional)::text as prov
       from kq.current_roster`,
  )

  // ── Needs a look ───────────────────────────────────────────────────────────
  const concerns: Concern[] = []

  // Children nobody may legally collect. The one that stops a Sunday.
  const { rows: noCollector } = await db.query<{ n: string }>(
    `select count(*)::text as n
       from kq.current_roster r
      where not exists (
        select 1 from kq.child_guardians cg
         where cg.child_id = r.child_id and cg.can_pickup
      )`,
  )
  if (Number(noCollector[0]!.n) > 0) {
    concerns.push({
      kind: 'blocker',
      headline: `${noCollector[0]!.n} children`,
      detail: 'have nobody authorised to collect them',
      meta: 'check-out needs an override',
    })
  }

  // Not seen across the last four Sundays we hold sessions for. Deliberately
  // relative to the data, not to today — there is a gap between the last marked
  // sheet and now, and measuring from today would flag the entire roster.
  const recentFour = dates.slice(0, 4)
  if (recentFour.length > 0) {
    const { rows: missing } = await db.query<{ n: string; sample: string | null }>(
      `with seen as (
         select distinct a.child_id
           from kq.attendance a
           join kq.sessions s on s.id = a.session_id
          where s.service_date = any($1::date[]) and ${ATTENDED}
       )
       select count(*)::text as n,
              (array_agg(r.first_name || ' ' || r.last_name order by r.first_name))[1] as sample
         from kq.current_roster r
        where r.child_id not in (select child_id from seen)`,
      [recentFour],
    )
    const n = Number(missing[0]!.n)
    if (n > 0) {
      concerns.push({
        kind: 'check',
        headline: `${n} children`,
        detail: `not seen in the last ${recentFour.length} Sundays`,
        meta: missing[0]!.sample ? `e.g. ${missing[0]!.sample}` : '',
      })
    }
  }

  // Placements carried over from the import that no teacher has confirmed.
  const prov = Number(nowRows[0]!.prov)
  if (prov > 0) {
    concerns.push({
      kind: 'check',
      headline: `${prov} placements`,
      detail: 'unconfirmed after the rollover — the child may be in the wrong room',
      meta: 'no grade on file',
    })
  }

  const { rows: review } = await db.query<{ n: string }>(
    `select count(*)::text as n from kq.import_review where status = 'pending'`,
  )
  if (Number(review[0]!.n) > 0) {
    concerns.push({
      kind: 'check',
      headline: `${review[0]!.n} items`,
      detail: 'from the import waiting to be reviewed',
      meta: 'duplicates, bad numbers, merges',
    })
  }

  const attendedLatest = sundays.find((s) => s.date === latest)?.attended ?? 0
  const attendedPrevious = sundays.find((s) => s.date === previous)?.attended ?? 0

  return {
    latestSunday: latest,
    previousSunday: previous,
    attendedLatest,
    attendedPrevious,
    rosterNow: Number(nowRows[0]!.n),
    groups,
    sundays,
    concerns,
    provisionalTotal: prov,
  }
}
