/**
 * Queries for the Attendance section.
 *
 * This section exists because of one correction: the dashboard had been
 * quoting figures against the 6,840 records in Planning Center. That is not a
 * denominator — it counts alumni, one-time visitors and people who have left
 * Hanoi. Sunday attendance is 400–500.
 *
 * Two sources, deliberately not merged:
 *
 *   ops.service_attendance — one row per campus per Sunday, counted at the
 *                            door. The grain we want.
 *   ops.monthly_metrics    — monthly AVERAGES from the spreadsheet, going back
 *                            to autumn 2025. Historical context only.
 *
 * An average is not a service. Averaging averages together, or storing one as
 * if it were a headcount, would produce a number nobody could trace back to a
 * Sunday. They are shown side by side and labelled.
 */

import { getPool } from '../db'

const rows = async <T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> => {
  const res = await getPool().query<T>(sql, params)
  return res.rows
}

// ── Baselines ────────────────────────────────────────────────────────────────

export type Baseline = {
  campus: string
  baseline: string
  label: string
  value: number | null
  based_on: number
  as_of: string
}

export async function getBaselines(): Promise<Baseline[]> {
  return rows<Baseline>(`
    select campus, baseline, label, value, based_on, as_of::text
      from ops.attendance_baselines
     order by campus, baseline, as_of desc
  `)
}

// ── Services actually counted ────────────────────────────────────────────────

export type ServiceRow = {
  id: string
  campus: string
  service_date: string
  adults: number | null
  kids: number | null
  kids_source: string
  total: number | null
  is_benchmark: boolean
  benchmark_label: string | null
  note: string | null
}

export async function getServices(limit = 60): Promise<ServiceRow[]> {
  return rows<ServiceRow>(
    `select id::text, campus, service_date::text, adults, kids, kids_source,
            total, is_benchmark, benchmark_label, note
       from ops.service_attendance
      order by service_date desc, campus
      limit $1`,
    [limit],
  )
}

// ── Historical monthly averages, from the spreadsheet ────────────────────────

export type HistoricRow = {
  metric_label: string
  period_month: string
  value: number | null
  value_status: string
}

export async function getHistoricSunday(): Promise<HistoricRow[]> {
  return rows<HistoricRow>(`
    select metric_label,
           to_char(period_month, 'YYYY-MM') as period_month,
           value,
           value_status
      from ops.monthly_metrics
     where metric_label ilike '%sunday%'
        or metric_label ilike '%kidsquest%'
     order by metric_label, period_month
  `)
}

// ── KidsQuest ────────────────────────────────────────────────────────────────
//
// Children are counted by KidsQuest's own register, so a service total without
// them is not the congregation. Their history was imported to the end of July
// 2026; August has sessions but no check-ins, which reads as zero and is not.

export type KidsWeek = {
  service_date: string
  children: number
  sessions: number
  from_station: number
}

export async function getKidsByWeek(limit = 20): Promise<KidsWeek[]> {
  return rows<KidsWeek>(
    `select s.service_date::text                                          as service_date,
            count(distinct a.child_id)::int                               as children,
            count(distinct s.id)::int                                     as sessions,
            count(distinct a.child_id) filter (where a.source = 'station')::int as from_station
       from kq.sessions s
       left join kq.attendance a on a.session_id = s.id
      group by s.service_date
      order by s.service_date desc
      limit $1`,
    [limit],
  )
}

export type KidsSummary = {
  children: number
  sessions: number
  rows: number
  fromStation: number
  fromImport: number
  first: string | null
  last: string | null
  lastWithChildren: string | null
}

export async function getKidsSummary(): Promise<KidsSummary> {
  const [r] = await rows<Record<string, string>>(`
    select (select count(*) from kq.children)::text                              as children,
           (select count(*) from kq.sessions)::text                              as sessions,
           (select count(*) from kq.attendance)::text                            as rows,
           (select count(*) from kq.attendance where source = 'station')::text   as from_station,
           (select count(*) from kq.attendance where source = 'import')::text    as from_import,
           (select min(service_date)::text from kq.sessions)                     as first,
           (select max(service_date)::text from kq.sessions)                     as last,
           (select max(s.service_date)::text from kq.sessions s
              join kq.attendance a on a.session_id = s.id)                       as last_with_children
  `)
  return {
    children: Number(r?.children ?? 0),
    sessions: Number(r?.sessions ?? 0),
    rows: Number(r?.rows ?? 0),
    fromStation: Number(r?.from_station ?? 0),
    fromImport: Number(r?.from_import ?? 0),
    first: r?.first ?? null,
    last: r?.last ?? null,
    lastWithChildren: r?.last_with_children ?? null,
  }
}

/**
 * Recent Sundays still missing an adult headcount.
 *
 * Generated from the calendar rather than from the table, so a Sunday nobody
 * created a row for still appears. An absence that is not on screen is an
 * absence nobody fixes.
 */
export type PendingService = {
  id: string | null
  campus: string
  service_date: string
  adults: number | null
  kids: number | null
  kids_source: string
}

export async function getPendingServices(weeks = 6): Promise<PendingService[]> {
  return rows<PendingService>(
    `with sundays as (
       select generate_series(
                date_trunc('week', (now() at time zone 'Asia/Ho_Chi_Minh')::date)::date - ($1 * 7) - 1,
                date_trunc('week', (now() at time zone 'Asia/Ho_Chi_Minh')::date)::date - 1,
                interval '7 days'
              )::date as service_date
     ),
     campuses as (
       -- Campuses we already record, so a new venue appears here as soon as it
       -- has one service rather than needing a code change.
       select distinct campus from ops.service_attendance
       union
       select 'MyDinh'
     )
     select sa.id::text                       as id,
            c.campus                          as campus,
            s.service_date::text              as service_date,
            sa.adults                         as adults,
            sa.kids                           as kids,
            coalesce(sa.kids_source,'unknown') as kids_source
       from sundays s
       cross join campuses c
       left join ops.service_attendance sa
              on sa.campus = c.campus and sa.service_date = s.service_date
      where sa.adults is null
      order by s.service_date desc, c.campus`,
    [weeks],
  )
}

/** The record count, shown once and explicitly labelled as not a denominator. */
export async function getRecordCount(): Promise<{ total: number; active: number }> {
  const [r] = await rows<Record<string, string>>(`
    select count(*)::text                                        as total,
           count(*) filter (where status = 'active')::text        as active
      from pco.people
  `)
  return { total: Number(r?.total ?? 0), active: Number(r?.active ?? 0) }
}
