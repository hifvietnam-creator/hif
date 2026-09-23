/**
 * The register grid: children down, Sundays across.
 *
 * The shape the ministry already reads, backed by data that knows more than a
 * spreadsheet did. Three distinctions a paper sheet cannot make, and all three
 * matter:
 *
 *   Not yet joined vs absent.  A child who joined in August was not absent in
 *                              May. Showing both as an empty cell makes every
 *                              new child look like a poor attender and quietly
 *                              wrecks the percentages.
 *
 *   Paper vs station.          Everything before the app went in is a tick
 *                              somebody wrote. A station row knows the time and
 *                              the adult. Flattening them loses the only
 *                              evidence of who took a child home.
 *
 *   Checked in, never out.     Not an attendance fact. A child with no
 *                              check-out is either a missed tap or a child
 *                              nobody recorded leaving, and the second one is
 *                              worth finding.
 */

import { getPool, isoDate } from '../db'

export type { CellState, RegisterCell, RegisterRow } from './register-types'
import type { CellState, RegisterCell, RegisterRow } from './register-types'

export type RegisterData = {
  dates: string[]
  rows: RegisterRow[]
  perDate: number[]
  groups: { code: string; label: string; count: number }[]
  totalSundays: number
}

/**
 * @param groupCode  a single group, or null for everybody
 * @param weeks      how many recent Sundays, or 0 for the lot
 */
export async function getRegister(
  groupCode: string | null,
  weeks: number,
): Promise<RegisterData> {
  const db = getPool()

  const { rows: allDates } = await db.query<{ d: Date }>(
    `select distinct service_date as d from kq.sessions order by 1 desc`,
  )
  const totalSundays = allDates.length
  const dates = allDates
    .slice(0, weeks > 0 ? weeks : allDates.length)
    .map((r) => isoDate(r.d)!)
    .reverse()

  const { rows: groupRows } = await db.query<{ code: string; label: string; n: string }>(
    `select g.code, g.label,
            (select count(*) from kq.current_roster r where r.group_code = g.code)::text as n
       from kq.groups g
      where g.active and g.code <> 'aftershock'
      order by g.sort_order`,
  )
  const groups = groupRows.map((g) => ({ code: g.code, label: g.label, count: Number(g.n) }))

  if (dates.length === 0) {
    return { dates: [], rows: [], perDate: [], groups, totalSundays }
  }

  // `joined` is the earliest enrolment we hold, not the current one. A child
  // who moved group in August has been with us since May, and their May cells
  // should read as absences rather than as not-yet-arrived.
  const { rows: kids } = await db.query<{
    child_id: string; name: string; group_code: string; joined: Date | null
    grade: number | null; gender: string | null
  }>(
    `select r.child_id,
            coalesce(r.preferred_name, r.first_name) || ' ' || r.last_name as name,
            r.group_code, r.grade, r.gender,
            (select min(e.started_on) from kq.enrollments e where e.child_id = r.child_id) as joined
       from kq.current_roster r
      where ($1::text is null or r.group_code = $1)
      order by lower(coalesce(r.preferred_name, r.first_name)), lower(r.last_name)`,
    [groupCode],
  )

  if (kids.length === 0) {
    return { dates, rows: [], perDate: dates.map(() => 0), groups, totalSundays }
  }

  const ids = kids.map((k) => parseInt(k.child_id, 10))
  const { rows: marks } = await db.query<{
    child_id: string; d: Date; status: string; source: string
    checked_in_at: Date | null; checked_out_at: Date | null; group_code: string
  }>(
    `select a.child_id, s.service_date as d, a.status, a.source,
            a.checked_in_at, a.checked_out_at, s.group_code
       from kq.attendance a
       join kq.sessions s on s.id = a.session_id
      -- 'absent' rows are fetched too. They are not the same as no record:
      -- an absent row means somebody actively said this child was not there,
      -- which the grid shows differently from a Sunday nobody wrote anything.
      where a.child_id = any($1::bigint[])
        and s.service_date = any($2::date[])`,
    [ids, dates],
  )

  const byChild = new Map<string, (typeof marks)[number]>()
  for (const m of marks) byChild.set(`${m.child_id}|${isoDate(m.d)}`, m)

  const perDate = dates.map(() => 0)

  const rows: RegisterRow[] = kids.map((k) => {
    const joined = isoDate(k.joined)
    let present = 0
    let possible = 0

    const cells = dates.map((d, i): RegisterCell => {
      const m = byChild.get(`${k.child_id}|${d}`)

      if (m) {
        const wasHere = m.status === 'present' || m.status === 'checked_out'
        possible++
        if (wasHere) { present++; perDate[i]!++ }

        const state: CellState =
          // A record exists but says absent, so somebody corrected it. If there
          // is still a check-in time on the row, that is a station record an
          // administrator overruled rather than an empty cell.
          !wasHere ? 'removed'
          : m.source === 'correction' ? 'added'
          : m.source !== 'station' ? 'paper'
          : m.checked_out_at ? 'station'
          : 'still_in'

        return {
          state,
          group: m.group_code,
          checkedInAt: m.checked_in_at?.toISOString() ?? null,
          checkedOutAt: m.checked_out_at?.toISOString() ?? null,
        }
      }

      // Not on any register that week, so not an absence.
      if (joined && d < joined) return { state: 'not_yet', group: null, checkedInAt: null, checkedOutAt: null }

      possible++
      return { state: 'absent', group: null, checkedInAt: null, checkedOutAt: null }
    })

    return {
      childId: parseInt(k.child_id, 10),
      name: k.name,
      groupCode: k.group_code,
      grade: k.grade,
      gender: k.gender,
      joined,
      cells,
      present,
      possible,
    }
  })

  return { dates, rows, perDate, groups, totalSundays }
}
