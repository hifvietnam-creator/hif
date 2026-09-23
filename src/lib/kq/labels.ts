/**
 * Everything one printed tag needs, in a single query.
 *
 * NOT USED BY THE STATION ANY MORE. Nothing prints at the door: the ministry
 * keeps physical cards and hands them over, so there is no label to produce.
 *
 * Kept because the route is still the only way to render a tag, and Ate will
 * want something like it when she comes to print the cards themselves. The code
 * it shows now comes from kq.children.card_code, which is stable, rather than
 * the per-session code this was originally built around.
 */

import { getPool, isoDate } from '../db'

export type LabelData = {
  attendanceId: number
  sessionId: number
  childName: string
  groupLabel: string
  serviceDate: string
  securityCode: string | null
  allergies: string | null
  guardianName: string | null
}

export async function getLabel(attendanceId: number): Promise<LabelData | null> {
  const { rows } = await getPool().query<{
    id: string; session_id: string
    child_name: string; group_label: string; service_date: Date
    security_code: string | null; allergies: string | null
    guardian_name: string | null
  }>(
    `select a.id, a.session_id,
            coalesce(c.preferred_name, c.first_name) || ' ' || c.last_name as child_name,
            g.label as group_label,
            s.service_date,
            c.card_code as security_code,
            c.allergies,
            gu.full_name as guardian_name
       from kq.attendance a
       join kq.children  c  on c.id  = a.child_id
       join kq.sessions  s  on s.id  = a.session_id
       join kq.groups    g  on g.code = s.group_code
       left join kq.guardians gu on gu.id = a.checked_in_guardian
      where a.id = $1`,
    [attendanceId],
  )

  const r = rows[0]
  if (!r) return null

  return {
    attendanceId: parseInt(r.id, 10),
    sessionId: parseInt(r.session_id, 10),
    childName: r.child_name,
    groupLabel: r.group_label,
    serviceDate: isoDate(r.service_date)!,
    securityCode: r.security_code,
    allergies: r.allergies,
    guardianName: r.guardian_name,
  }
}
