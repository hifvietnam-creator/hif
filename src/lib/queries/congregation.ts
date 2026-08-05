/**
 * Queries for the Congregation Overview dashboard page.
 *
 * Every figure here is a direct count from the mirrored PCO data — no derived
 * journey stages, no inferred categories, no modelling. Membership statuses
 * appear exactly as Planning Center holds them.
 *
 * That is deliberate. This page exists so staff can confirm the data is right;
 * anything interpreted would make disagreements hard to localise. If a number
 * looks wrong, it should be wrong in PCO or wrong in the sync — not wrong in
 * a definition nobody has agreed yet.
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

export type Headline = {
  people: number
  active: number
  inactive: number
  withEmail: number
  withoutEmail: number
  inGroup: number
  groups: number
  serving: number
  teams: number
}

export async function getHeadline(): Promise<Headline> {
  const [people, active, withEmail, inGroup, groups, serving, teams] = await Promise.all([
    scalar('select count(*)::text n from pco.people'),
    scalar(`select count(*)::text n from pco.people where status = 'active'`),
    scalar('select count(distinct person_id)::text n from pco.emails'),
    scalar('select count(distinct person_id)::text n from pco.group_memberships'),
    scalar('select count(*)::text n from pco.groups where archived_at is null'),
    scalar('select count(distinct person_id)::text n from pco.team_assignments'),
    scalar('select count(*)::text n from pco.teams where archived_at is null'),
  ])

  return {
    people,
    active,
    inactive: people - active,
    withEmail,
    withoutEmail: people - withEmail,
    inGroup,
    groups,
    serving,
    teams,
  }
}

// ── Membership status, exactly as PCO holds it ───────────────────────────────

export async function getMembershipBreakdown(): Promise<CountRow[]> {
  return rows<{ label: string; count: number }>(`
    select coalesce(membership, '(not set)') as label,
           count(*)::int as count
      from pco.people
     group by 1
     order by count(*) desc
  `)
}

// ── Nationality ──────────────────────────────────────────────────────────────
// From a custom field, so coverage is partial — the page states the fill rate
// rather than implying these are shares of the whole congregation.

export async function getNationalities(limit = 15): Promise<{
  rows: CountRow[]
  covered: number
  distinct: number
}> {
  const [list, covered, distinct] = await Promise.all([
    rows<{ label: string; count: number }>(
      `select fd.value as label, count(*)::int as count
         from pco.field_data fd
         join pco.field_definitions d on d.id = fd.field_definition_id
        where d.name = 'Nationality' and nullif(trim(fd.value),'') is not null
        group by 1 order by count(*) desc limit $1`,
      [limit],
    ),
    scalar(`
      select count(distinct fd.person_id)::text n
        from pco.field_data fd
        join pco.field_definitions d on d.id = fd.field_definition_id
       where d.name = 'Nationality' and nullif(trim(fd.value),'') is not null
    `),
    scalar(`
      select count(distinct fd.value)::text n
        from pco.field_data fd
        join pco.field_definitions d on d.id = fd.field_definition_id
       where d.name = 'Nationality' and nullif(trim(fd.value),'') is not null
    `),
  ])
  return { rows: list, covered, distinct }
}

// ── Campus ───────────────────────────────────────────────────────────────────

export async function getCampuses(): Promise<CountRow[]> {
  return rows<{ label: string; count: number }>(`
    select coalesce(c.name, '(no campus)') as label, count(*)::int as count
      from pco.people p
      left join pco.campuses c on c.id = p.primary_campus_id
     group by 1
     order by count(*) desc
  `)
}

// ── Group connection by membership status ────────────────────────────────────

export type ConnectionRow = {
  label: string
  total: number
  in_group: number
}

export async function getGroupConnection(): Promise<ConnectionRow[]> {
  return rows<ConnectionRow>(`
    select coalesce(p.membership,'(not set)') as label,
           count(*)::int as total,
           count(*) filter (where g.person_id is not null)::int as in_group
      from pco.people p
      left join (select distinct person_id from pco.group_memberships) g
             on g.person_id = p.id
     group by 1
     order by count(*) desc
  `)
}

// ── Groups ───────────────────────────────────────────────────────────────────

export async function getGroupTypes(): Promise<
  { label: string; groups: number; people: number }[]
> {
  return rows(`
    select coalesce(gt.name,'(no type)') as label,
           count(distinct g.id)::int as groups,
           count(distinct gm.person_id)::int as people
      from pco.groups g
      left join pco.group_types gt on gt.id = g.group_type_id
      left join pco.group_memberships gm on gm.group_id = g.id
     where g.archived_at is null
     group by 1
     order by count(distinct gm.person_id) desc
  `)
}

// ── Data provenance ──────────────────────────────────────────────────────────
// Shown on the page so nobody argues about a number that came from a stale
// sync. Staleness should be visible, not discovered.

export type SyncStatus = {
  resource: string
  last_run_at: string | null
  last_run_status: string | null
  records_seen: number | null
  last_error: string | null
}

export async function getSyncStatus(): Promise<SyncStatus[]> {
  return rows<SyncStatus>(`
    select resource, last_run_at, last_run_status, records_seen, last_error
      from hif.sync_state
     order by resource
  `)
}
