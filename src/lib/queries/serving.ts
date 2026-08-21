/**
 * Queries for the Serving & Ministry dashboard section.
 *
 * Read the caveat before trusting any number here.
 *
 * There are two different serving sources and they measure different things:
 *
 *   pco.team_assignments — standing membership of a team. "On the rota."
 *   pco.plan_people      — an actual scheduled slot, with a status
 *                          (C confirmed / U unconfirmed / D declined).
 *
 * A standing assignment is not evidence anyone served. A run of confirmed
 * plan_people is. The page shows both and never adds them together.
 *
 * The bigger trap: Planning Center Services is used here for worship and media
 * only. Most teams have no scheduling data at all, so "schedulings" is not a
 * measure of who serves at HIF — it is a measure of who serves *in the
 * ministries that use Services*. Every function that returns scheduling counts
 * also returns the coverage figure so the page can say so.
 */

import { getPool } from '../db'

export type CountRow = { label: string; count: number }

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

export type ServingHeadline = {
  peopleAssigned: number
  teams: number
  teamsWithScheduling: number
  serviceTypes: number
  positions: number
  plans: number
  schedulings: number
  peopleScheduled: number
  peopleConfirmed: number
}

export async function getServingHeadline(): Promise<ServingHeadline> {
  const [
    peopleAssigned,
    teams,
    teamsWithScheduling,
    serviceTypes,
    positions,
    plans,
    schedulings,
    peopleScheduled,
    peopleConfirmed,
  ] = await Promise.all([
    scalar('select count(distinct person_id)::text n from pco.team_assignments'),
    scalar('select count(*)::text n from pco.teams where archived_at is null'),
    scalar('select count(distinct team_id)::text n from pco.plan_people where team_id is not null'),
    scalar('select count(*)::text n from pco.service_types where archived_at is null'),
    scalar('select count(*)::text n from pco.team_positions'),
    scalar('select count(*)::text n from pco.plans'),
    scalar('select count(*)::text n from pco.plan_people'),
    scalar('select count(distinct person_id)::text n from pco.plan_people where person_id is not null'),
    scalar(`select count(distinct person_id)::text n from pco.plan_people where status = 'C'`),
  ])

  return {
    peopleAssigned,
    teams,
    teamsWithScheduling,
    serviceTypes,
    positions,
    plans,
    schedulings,
    peopleScheduled,
    peopleConfirmed,
  }
}

// ── Per ministry (service type) ──────────────────────────────────────────────
//
// Scalar subqueries rather than a chain of LEFT JOINs: joining teams,
// assignments, plans and plan_people in one query multiplies rows against each
// other and silently inflates every count. With eight service types the cost is
// irrelevant and the correctness is not.

export type MinistryRow = {
  id: string
  label: string
  teams: number
  people: number
  plans: number
  schedulings: number
  confirmed: number
}

export async function getMinistryOverview(): Promise<MinistryRow[]> {
  return rows<MinistryRow>(`
    select
      st.id::text as id,
      coalesce(st.name, '(unnamed)') as label,
      (select count(*) from pco.teams t
        where t.service_type_id = st.id and t.archived_at is null)::int as teams,
      (select count(distinct ta.person_id) from pco.team_assignments ta
         join pco.teams t on t.id = ta.team_id
        where t.service_type_id = st.id)::int as people,
      (select count(*) from pco.plans p
        where p.service_type_id = st.id)::int as plans,
      (select count(*) from pco.plan_people pp
         join pco.plans p on p.id = pp.plan_id
        where p.service_type_id = st.id)::int as schedulings,
      (select count(*) from pco.plan_people pp
         join pco.plans p on p.id = pp.plan_id
        where p.service_type_id = st.id and pp.status = 'C')::int as confirmed
    from pco.service_types st
    where st.archived_at is null
    order by people desc, schedulings desc
  `)
}

// ── Per team ─────────────────────────────────────────────────────────────────

export type TeamRow = {
  id: string
  label: string
  ministry: string
  people: number
  schedulings: number
  confirmed: number
  declined: number
}

export async function getTeams(): Promise<TeamRow[]> {
  return rows<TeamRow>(`
    select
      t.id::text as id,
      coalesce(t.name, '(unnamed)') as label,
      coalesce(st.name, '(no service type)') as ministry,
      (select count(distinct ta.person_id) from pco.team_assignments ta
        where ta.team_id = t.id)::int as people,
      (select count(*) from pco.plan_people pp where pp.team_id = t.id)::int as schedulings,
      (select count(*) from pco.plan_people pp
        where pp.team_id = t.id and pp.status = 'C')::int as confirmed,
      (select count(*) from pco.plan_people pp
        where pp.team_id = t.id and pp.status = 'D')::int as declined
    from pco.teams t
    left join pco.service_types st on st.id = t.service_type_id
    where t.archived_at is null
    order by people desc, schedulings desc
  `)
}

// ── How often people actually serve ──────────────────────────────────────────
//
// Counts CONFIRMED slots only. Someone scheduled twenty times who declined all
// twenty has not served, and lumping them in with regulars would be the exact
// kind of flattery this dashboard is meant to avoid.

export async function getServingFrequency(): Promise<CountRow[]> {
  return rows<CountRow>(`
    with per_person as (
      select person_id,
             count(*) filter (where status = 'C')::int as confirmed
        from pco.plan_people
       where person_id is not null
       group by person_id
    )
    select case
             when confirmed = 0                 then 'scheduled, never confirmed'
             when confirmed between 1 and 2     then '1–2 times'
             when confirmed between 3 and 9     then '3–9 times'
             when confirmed between 10 and 24   then '10–24 times'
             else '25+ times'
           end as label,
           count(*)::int as count,
           min(confirmed) as sort_key
      from per_person
     group by 1
     order by min(confirmed)
  `)
}

// ── Response to being scheduled ──────────────────────────────────────────────

export async function getSchedulingResponse(): Promise<CountRow[]> {
  return rows<CountRow>(`
    select case status
             when 'C' then 'Confirmed'
             when 'D' then 'Declined'
             when 'U' then 'Unconfirmed'
             else coalesce(status, '(no status)')
           end as label,
           count(*)::int as count
      from pco.plan_people
     group by 1
     order by count(*) desc
  `)
}

// ── Leadership ladder (custom field) ─────────────────────────────────────────
//
// Ordered by the ladder itself, not by size. The shape of a pipeline is the
// point; sorting by count would hide that the top rungs are nearly empty.

export async function getRoleInMinistry(): Promise<{ rows: CountRow[]; covered: number }> {
  // The role lives in THREE fields — "Role in Ministry (1st)", "(2nd)", "(3rd)"
  // — one per ministry a person serves in. Counting every value would place the
  // same person on several rungs at once and overstate the pipeline.
  //
  // So each person is counted once, at their highest rung. "Leading Others in
  // youth and Leading Self in hospitality" is one leader of others, not one of
  // each.
  const [list, covered] = await Promise.all([
    rows<CountRow>(`
      with roles as (
        select fd.person_id,
               trim(fd.value) as value,
               case lower(trim(fd.value))
                 when 'leading self'             then 1
                 when 'leading others'           then 2
                 when 'leading leaders'          then 3
                 when 'leading ministries'       then 4
                 when 'leading the organization' then 5
                 else 0
               end as rung
          from pco.field_data fd
          join pco.field_definitions d on d.id = fd.field_definition_id
         where d.name like 'Role in Ministry%'
           and nullif(trim(fd.value), '') is not null
      ),
      highest as (
        select distinct on (person_id) person_id, value, rung
          from roles
         order by person_id, rung desc
      )
      select value as label, count(*)::int as count
        from highest
       group by value, rung
       order by rung, count(*) desc
    `),
    scalar(`
      select count(distinct fd.person_id)::text n
        from pco.field_data fd
        join pco.field_definitions d on d.id = fd.field_definition_id
       where d.name like 'Role in Ministry%'
         and nullif(trim(fd.value), '') is not null
    `),
  ])
  return { rows: list, covered }
}

// ── "Volunteer in Ministry" custom field ─────────────────────────────────────
//
// Covers more ministries than Services does, but carries no dates — it says
// someone was listed, never when or how often. Complementary to scheduling
// data, not a substitute for it.

export async function getVolunteerMinistries(limit = 20): Promise<{
  rows: CountRow[]
  covered: number
  freeText: number
}> {
  // Also three fields: "Volunteer in Ministry (1st)", "(2nd)", "(3rd)". Here
  // counting all of them IS right — someone serving in two ministries should
  // appear under both. `count(distinct person_id)` keeps a single person from
  // being counted twice within one ministry.
  const [list, covered, freeText] = await Promise.all([
    rows<CountRow>(
      `select trim(fd.value) as label, count(distinct fd.person_id)::int as count
         from pco.field_data fd
         join pco.field_definitions d on d.id = fd.field_definition_id
        where d.name like 'Volunteer in Ministry (%'
          and nullif(trim(fd.value), '') is not null
        group by 1
        order by count(distinct fd.person_id) desc
        limit $1`,
      [limit],
    ),
    scalar(`
      select count(distinct fd.person_id)::text n
        from pco.field_data fd
        join pco.field_definitions d on d.id = fd.field_definition_id
       where d.name like 'Volunteer in Ministry (%'
         and nullif(trim(fd.value), '') is not null
    `),
    // A fourth, free-text field exists for people serving in more than three
    // ministries. Not charted — the values are unnormalised — but the count is
    // worth surfacing so it is not forgotten.
    scalar(`
      select count(distinct fd.person_id)::text n
        from pco.field_data fd
        join pco.field_definitions d on d.id = fd.field_definition_id
       where d.name like 'Volunteer in 4th%'
         and nullif(trim(fd.value), '') is not null
    `),
  ])
  return { rows: list, covered, freeText }
}

/** How many ministries each volunteer serves in — breadth, not just headcount. */
export async function getVolunteerSpread(): Promise<CountRow[]> {
  return rows<CountRow>(`
    with per_person as (
      select fd.person_id, count(distinct trim(fd.value))::int as ministries
        from pco.field_data fd
        join pco.field_definitions d on d.id = fd.field_definition_id
       where d.name like 'Volunteer in Ministry (%'
         and nullif(trim(fd.value), '') is not null
       group by fd.person_id
    )
    select case ministries
             when 1 then '1 ministry'
             when 2 then '2 ministries'
             else '3 ministries'
           end as label,
           count(*)::int as count
      from per_person
     group by ministries
     order by ministries
  `)
}

// ── Recent services ──────────────────────────────────────────────────────────

export type PlanRow = {
  id: string
  title: string
  ministry: string
  sort_date: string | null
  scheduled: number
  confirmed: number
}

export async function getRecentPlans(limit = 12): Promise<PlanRow[]> {
  return rows<PlanRow>(
    `select
       p.id::text as id,
       coalesce(nullif(trim(p.title), ''), nullif(trim(p.dates), ''), '(untitled)') as title,
       coalesce(st.name, '(no service type)') as ministry,
       p.sort_date,
       (select count(*) from pco.plan_people pp where pp.plan_id = p.id)::int as scheduled,
       (select count(*) from pco.plan_people pp
         where pp.plan_id = p.id and pp.status = 'C')::int as confirmed
     from pco.plans p
     left join pco.service_types st on st.id = p.service_type_id
     where p.sort_date is not null
     order by p.sort_date desc
     limit $1`,
    [limit],
  )
}

// ── People serving with no scheduling record ─────────────────────────────────
//
// On a team's rota but never scheduled. Either the team does not use Services,
// or the rota is stale. Both are worth someone looking at.

export async function getAssignedNeverScheduled(): Promise<number> {
  return scalar(`
    select count(*)::text n from (
      select distinct ta.person_id
        from pco.team_assignments ta
       where not exists (
         select 1 from pco.plan_people pp
          where pp.person_id = ta.person_id and pp.status = 'C'
       )
    ) x
  `)
}
