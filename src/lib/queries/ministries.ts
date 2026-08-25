/**
 * Queries for the Ministries dashboard section.
 *
 * Two sources, deliberately kept distinct:
 *
 *   ops.ministry_events   — per-gathering attendance from Planning Center
 *                           Groups. Behavioural: someone was counted.
 *   ops.monthly_metrics   — the figures from the Monthly Metrics spreadsheet.
 *                           Mostly headcounts a person wrote down.
 *
 * They are never merged into one number. Where both exist for a ministry the
 * page shows them side by side, because a disagreement between them is
 * information — it usually means the roster and the room have drifted apart.
 *
 * On gaps: monthly_metrics.value_status distinguishes a real zero from
 * "nobody recorded it" from "it did not run". Only `reported` and `zero` are
 * ever averaged. Treating unknown as zero would draw declines that never
 * happened, and roughly half that spreadsheet is not filled in.
 */

import { getPool } from '../db'

const rows = async <T extends Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> => {
  const res = await getPool().query<T>(sql, params)
  return res.rows
}

const scalar = async (sql: string): Promise<number> => {
  const r = await rows<{ n: string }>(sql)
  return parseInt(r[0]?.n ?? '0', 10)
}

// ── Headline ─────────────────────────────────────────────────────────────────

export type MinistryHeadline = {
  ministries: number
  activeMinistries: number
  events: number
  firstEvent: string | null
  lastEvent: string | null
  totalAttendances: number
  totalGuests: number
  metricsTracked: number
  metricsReported: number
  metricsMissing: number
}

export async function getMinistryHeadline(): Promise<MinistryHeadline> {
  const [
    ministries,
    activeMinistries,
    events,
    span,
    totals,
    metricsTracked,
    metricsReported,
    metricsMissing,
  ] = await Promise.all([
    scalar('select count(*)::text n from ops.ministries'),
    scalar('select count(*)::text n from ops.ministries where is_active'),
    scalar('select count(*)::text n from ops.ministry_events'),
    rows<{ first: string | null; last: string | null }>(
      `select min(event_date)::text as first, max(event_date)::text as last from ops.ministry_events`,
    ),
    rows<{ attended: string; guests: string }>(
      `select coalesce(sum(total_attended),0)::text as attended,
              coalesce(sum(visitors_attended),0)::text as guests
         from ops.ministry_events`,
    ),
    scalar('select count(*)::text n from ops.metric_definitions'),
    scalar(`select count(*)::text n from ops.monthly_metrics where value_status in ('reported','zero')`),
    scalar(`select count(*)::text n from ops.monthly_metrics where value_status = 'missing'`),
  ])

  return {
    ministries,
    activeMinistries,
    events,
    firstEvent: span[0]?.first ?? null,
    lastEvent: span[0]?.last ?? null,
    totalAttendances: parseInt(totals[0]?.attended ?? '0', 10),
    totalGuests: parseInt(totals[0]?.guests ?? '0', 10),
    metricsTracked,
    metricsReported,
    metricsMissing,
  }
}

// ── Per ministry, from event records ─────────────────────────────────────────

export type MinistryAttendanceRow = {
  id: string
  name: string
  category: string | null
  is_active: boolean
  events: number
  roster: number | null
  avg_members: number | null
  avg_guests: number | null
  turnout: number | null
  last_event: string | null
}

export async function getMinistryAttendance(): Promise<MinistryAttendanceRow[]> {
  return rows<MinistryAttendanceRow>(`
    select
      m.id::text                                   as id,
      m.name                                       as name,
      m.category                                   as category,
      m.is_active                                  as is_active,
      count(e.id)::int                             as events,
      max(e.members_count)::int                    as roster,
      round(avg(e.members_attended)::numeric, 1)   as avg_members,
      round(avg(e.visitors_attended)::numeric, 1)  as avg_guests,
      -- Turnout is members against the roster. Total attendance includes
      -- guests, and dividing that by a member roster produces figures over
      -- 100% for the groups that are doing best at welcoming people.
      case when max(e.members_count) > 0
           then round((avg(e.members_attended) / max(e.members_count) * 100)::numeric, 0)
           else null end                           as turnout,
      max(e.event_date)::text                      as last_event
    from ops.ministries m
    left join ops.ministry_events e on e.ministry_id = m.id
    group by m.id, m.name, m.category, m.is_active
    having count(e.id) > 0
    order by count(e.id) desc, m.name
  `)
}

// ── Attendance over time ─────────────────────────────────────────────────────

export type MonthPoint = { label: string; count: number }

export async function getAttendanceByMonth(): Promise<MonthPoint[]> {
  return rows<MonthPoint>(`
    select to_char(date_trunc('month', event_date), 'YYYY-MM') as label,
           coalesce(sum(total_attended), 0)::int               as count
      from ops.ministry_events
     group by 1
     order by 1
  `)
}

export async function getEventsByMonth(): Promise<MonthPoint[]> {
  return rows<MonthPoint>(`
    select to_char(date_trunc('month', event_date), 'YYYY-MM') as label,
           count(*)::int                                       as count
      from ops.ministry_events
     group by 1
     order by 1
  `)
}

// ── The monthly report, as leadership already knows it ───────────────────────

export type MetricCell = {
  metric_key: string
  metric_label: string
  owner: string | null
  source_kind: string | null
  period_month: string
  value: number | null
  value_status: string
}

export async function getMonthlyMetricCells(): Promise<MetricCell[]> {
  return rows<MetricCell>(`
    select mm.metric_key,
           mm.metric_label,
           md.owner,
           md.source_kind,
           to_char(mm.period_month, 'YYYY-MM') as period_month,
           mm.value,
           mm.value_status
      from ops.monthly_metrics mm
      left join ops.metric_definitions md on md.metric_key = mm.metric_key
     order by coalesce(md.sort_order, 999), mm.metric_label, mm.period_month
  `)
}

/**
 * How complete the existing report is, per metric.
 *
 * This is the number that justifies changing how data is collected. It is not
 * a criticism of anyone — it shows which ministries have no system behind them,
 * and those are exactly the ones where a person has to remember every month.
 */
export type CoverageRow = {
  metric_key: string
  metric_label: string
  owner: string | null
  source_kind: string | null
  months: number
  reported: number
  missing: number
  unknown: number
  not_applicable: number
}

export async function getMetricCoverage(): Promise<CoverageRow[]> {
  return rows<CoverageRow>(`
    select mm.metric_key,
           mm.metric_label,
           md.owner,
           md.source_kind,
           count(*)::int                                                   as months,
           count(*) filter (where mm.value_status in ('reported','zero'))::int as reported,
           count(*) filter (where mm.value_status = 'missing')::int        as missing,
           count(*) filter (where mm.value_status = 'unknown')::int        as unknown,
           count(*) filter (where mm.value_status = 'not_applicable')::int as not_applicable
      from ops.monthly_metrics mm
      left join ops.metric_definitions md on md.metric_key = mm.metric_key
     group by mm.metric_key, mm.metric_label, md.owner, md.source_kind, md.sort_order
     order by reported asc, coalesce(md.sort_order, 999)
  `)
}

// ── Registrations: who we met, and whether we knew them ──────────────────────

export type RegistrationEventRow = {
  event_label: string
  people: number
  with_email: number
  known: number
  new_contacts: number
  first_at: string | null
  last_at: string | null
}

export async function getRegistrationEvents(): Promise<RegistrationEventRow[]> {
  return rows<RegistrationEventRow>(`
    select event_label,
           count(*)::int                                                              as people,
           count(email)::int                                                          as with_email,
           count(pco_person_id)::int                                                  as known,
           -- Gave a working address, no church record. Reachable and unknown:
           -- the only group here that can actually be followed up.
           count(*) filter (where email is not null and pco_person_id is null)::int   as new_contacts,
           min(registered_at)::text                                                   as first_at,
           max(registered_at)::text                                                   as last_at
      from ops.registrations
     group by event_label
     order by count(*) desc
  `)
}

/**
 * People who registered for more than one event.
 *
 * This is the closest thing to a journey signal in the data: someone who came
 * to Pickleball and then Alpha did not merely attend twice, they came back.
 * Counted by distinct email, so it undercounts anyone who used two addresses —
 * undercounting is the safe direction.
 */
export async function getReturningRegistrants(): Promise<CountRow[]> {
  return rows<CountRow>(`
    with by_person as (
      select lower(email::text) as em, count(distinct event_label)::int as events
        from ops.registrations
       where email is not null
       group by 1
    )
    select case when events = 1 then 'One event only'
                when events = 2 then 'Two events'
                else 'Three or more'
           end                as label,
           count(*)::int      as count
      from by_person
     group by 1
     order by min(events)
  `)
}

export type ContactGap = {
  rows_with_email: number
  distinct_people: number
  already_known: number
  no_email_at_all: number
}

export async function getContactGap(): Promise<ContactGap> {
  const [r] = await rows<Record<string, string>>(`
    select
      count(*) filter (where email is not null and pco_person_id is null)::text          as rows_with_email,
      count(distinct lower(email::text)) filter
        (where email is not null and pco_person_id is null)::text                        as distinct_people,
      count(distinct pco_person_id) filter (where pco_person_id is not null)::text       as already_known,
      count(*) filter (where email is null)::text                                        as no_email_at_all
      from ops.registrations
  `)
  return {
    rows_with_email: parseInt(r?.rows_with_email ?? '0', 10),
    distinct_people: parseInt(r?.distinct_people ?? '0', 10),
    already_known: parseInt(r?.already_known ?? '0', 10),
    no_email_at_all: parseInt(r?.no_email_at_all ?? '0', 10),
  }
}

type CountRow = { label: string; count: number }

/** Where every figure came from — a dashboard nobody can audit gets ignored. */
export type ImportRow = {
  id: string
  filename: string
  kind: string
  snapshot_date: string | null
  row_count: number | null
  imported_at: string
}

export async function getImports(): Promise<ImportRow[]> {
  return rows<ImportRow>(`
    select id::text, filename, kind,
           snapshot_date::text,
           row_count,
           imported_at::text
      from ops.file_imports
     order by imported_at desc
     limit 25
  `)
}
