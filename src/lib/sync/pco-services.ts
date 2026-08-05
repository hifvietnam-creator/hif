/**
 * Sync Planning Center Services — the real serving data.
 *
 * Endpoint shapes confirmed against the live account via
 * scripts/probe-services.ts rather than assumed from documentation.
 *
 * Two signals, deliberately kept apart:
 *   team_assignments — who is ON a team's rota (standing membership)
 *   plan_people      — who was SCHEDULED for a specific service, with a
 *                      status of Confirmed / Unconfirmed / Declined
 *
 * A standing assignment says someone is on the worship team. A run of
 * confirmed plan_people says they actually serve. Don't conflate them.
 *
 * READ ONLY against PCO.
 */

import { paginate, type PcoResource } from '../pco'
import {
  getPool,
  maxWatermark,
  nullIfEmpty,
  toDate,
  upsert,
  withSyncState,
  type SyncResult,
} from '../db'

/** Person IDs present in pco.people. Services IDs share the People ID space
 *  (verified), but a person can still be missing if added since the last
 *  people sync — so check rather than trust. */
async function loadValidPeople(): Promise<Set<string>> {
  const { rows } = await getPool().query<{ id: string }>('select id::text from pco.people')
  return new Set(rows.map((r) => r.id))
}

// ── Service types ────────────────────────────────────────────────────────────

type ServiceTypeAttrs = {
  name: string | null
  sequence: number | null
  frequency: string | null
  archived_at: string | null
  created_at: string | null
  updated_at: string | null
}
type ServiceTypeRels = { parent: { data: { id: string; type: string } | null } }

export async function syncServiceTypes(): Promise<SyncResult> {
  return withSyncState('pco.service_types', async () => {
    const rows: unknown[][] = []

    for await (const page of paginate<PcoResource<ServiceTypeAttrs, ServiceTypeRels>>(
      '/services/v2/service_types',
    )) {
      for (const s of page.data) {
        const a = s.attributes
        rows.push([
          Number(s.id),
          nullIfEmpty(a.name),
          a.sequence ?? null,
          nullIfEmpty(a.frequency),
          s.relationships?.parent?.data?.id ? Number(s.relationships.parent.data.id) : null,
          toDate(a.archived_at),
          toDate(a.created_at),
          toDate(a.updated_at),
          new Date(),
        ])
      }
    }

    await upsert(
      getPool(),
      'pco.service_types',
      ['id', 'name', 'sequence', 'frequency', 'parent_id', 'archived_at', 'pco_created_at', 'pco_updated_at', 'synced_at'],
      rows,
    )
    return { recordsSeen: rows.length }
  })
}

// ── Teams ────────────────────────────────────────────────────────────────────

type TeamAttrs = {
  name: string | null
  sequence: number | null
  rehearsal_team: boolean | null
  schedule_to: string | null
  default_status: string | null
  archived_at: string | null
  created_at: string | null
  updated_at: string | null
}
type TeamRels = { service_type: { data: { id: string; type: string } | null } }

export async function syncTeams(): Promise<SyncResult> {
  return withSyncState('pco.teams', async () => {
    const rows: unknown[][] = []

    for await (const page of paginate<PcoResource<TeamAttrs, TeamRels>>('/services/v2/teams')) {
      for (const t of page.data) {
        const a = t.attributes
        rows.push([
          Number(t.id),
          t.relationships?.service_type?.data?.id
            ? Number(t.relationships.service_type.data.id)
            : null,
          nullIfEmpty(a.name),
          a.sequence ?? null,
          a.rehearsal_team ?? null,
          nullIfEmpty(a.schedule_to),
          nullIfEmpty(a.default_status),
          toDate(a.archived_at),
          toDate(a.created_at),
          toDate(a.updated_at),
          new Date(),
        ])
      }
    }

    await upsert(
      getPool(),
      'pco.teams',
      ['id', 'service_type_id', 'name', 'sequence', 'rehearsal_team', 'schedule_to', 'default_status', 'archived_at', 'pco_created_at', 'pco_updated_at', 'synced_at'],
      rows,
    )
    return { recordsSeen: rows.length }
  })
}

// ── Team positions and standing assignments ──────────────────────────────────
// Both are nested under a team — /services/v2/team_positions returns 404.

type PositionAttrs = { name: string | null; sequence: number | null }

type AssignmentAttrs = {
  schedule_preference: string | null
  preferred_weeks: unknown
  created_at: string | null
  updated_at: string | null
}
type AssignmentRels = {
  person: { data: { id: string; type: string } | null }
  team_position: { data: { id: string; type: string } | null }
}

export async function syncTeamDetail(): Promise<{
  positions: SyncResult
  assignments: SyncResult
}> {
  const db = getPool()
  const validPeople = await loadValidPeople()

  const { rows: teamRows } = await db.query<{ id: string; name: string | null }>(
    'select id::text, name from pco.teams where archived_at is null order by id',
  )

  const positions = await withSyncState('pco.team_positions', async () => {
    const rows: unknown[][] = []

    for (const team of teamRows) {
      for await (const page of paginate<PcoResource<PositionAttrs>>(
        `/services/v2/teams/${team.id}/team_positions`,
      )) {
        for (const p of page.data) {
          rows.push([
            Number(p.id),
            Number(team.id),
            nullIfEmpty(p.attributes.name),
            p.attributes.sequence ?? null,
            new Date(),
          ])
        }
      }
      process.stdout.write(`\r  team positions: ${rows.length}`)
    }
    process.stdout.write('\r' + ' '.repeat(40) + '\r')

    await upsert(db, 'pco.team_positions', ['id', 'team_id', 'name', 'sequence', 'synced_at'], rows)
    return { recordsSeen: rows.length }
  })

  const assignments = await withSyncState('pco.team_assignments', async () => {
    const rows: unknown[][] = []
    let skipped = 0
    let watermark: string | null = null

    for (const team of teamRows) {
      for await (const page of paginate<PcoResource<AssignmentAttrs, AssignmentRels>>(
        `/services/v2/teams/${team.id}/person_team_position_assignments`,
      )) {
        for (const asg of page.data) {
          const personId = asg.relationships?.person?.data?.id
          if (!personId || !validPeople.has(personId)) {
            skipped++
            continue
          }

          const a = asg.attributes
          rows.push([
            Number(asg.id),
            Number(personId),
            Number(team.id), // from loop context — payload has no team relationship
            asg.relationships?.team_position?.data?.id
              ? Number(asg.relationships.team_position.data.id)
              : null,
            nullIfEmpty(a.schedule_preference),
            a.preferred_weeks == null ? null : JSON.stringify(a.preferred_weeks),
            toDate(a.created_at),
            toDate(a.updated_at),
            new Date(),
          ])
          watermark = maxWatermark(watermark, a.updated_at)
        }
      }
      process.stdout.write(`\r  team assignments: ${rows.length}`)
    }
    process.stdout.write('\r' + ' '.repeat(40) + '\r')

    await upsert(
      db,
      'pco.team_assignments',
      ['id', 'person_id', 'team_id', 'team_position_id', 'schedule_preference', 'preferred_weeks', 'pco_created_at', 'pco_updated_at', 'synced_at'],
      rows,
    )

    if (skipped > 0) console.log(`  \x1b[2m${skipped} assignment(s) skipped — person not in pco.people\x1b[0m`)
    return { recordsSeen: rows.length, watermark }
  })

  return { positions, assignments }
}

// ── Plans ────────────────────────────────────────────────────────────────────

type PlanAttrs = {
  title: string | null
  series_title: string | null
  dates: string | null
  sort_date: string | null
  plan_people_count: number | null
  public: boolean | null
  created_at: string | null
  updated_at: string | null
}

/**
 * @param since Only keep plans on or after this date. Plans are fetched newest
 *              first, so we stop paginating once we pass the cutoff — the cost
 *              is proportional to the window, not to all history.
 */
export async function syncPlans(since: Date): Promise<SyncResult> {
  return withSyncState('pco.plans', async () => {
    const db = getPool()
    const { rows: serviceTypes } = await db.query<{ id: string }>(
      'select id::text from pco.service_types order by id',
    )

    const rows: unknown[][] = []

    for (const st of serviceTypes) {
      let stop = false
      for await (const page of paginate<PcoResource<PlanAttrs>>(
        `/services/v2/service_types/${st.id}/plans?order=-sort_date`,
      )) {
        for (const p of page.data) {
          const sortDate = toDate(p.attributes.sort_date)
          if (sortDate && sortDate < since) {
            stop = true
            break
          }
          const a = p.attributes
          rows.push([
            Number(p.id),
            Number(st.id),
            nullIfEmpty(a.title),
            nullIfEmpty(a.series_title),
            nullIfEmpty(a.dates),
            sortDate,
            a.plan_people_count ?? null,
            a.public ?? null,
            toDate(a.created_at),
            toDate(a.updated_at),
            new Date(),
          ])
        }
        if (stop) break
        process.stdout.write(`\r  plans: ${rows.length}`)
      }
    }
    process.stdout.write('\r' + ' '.repeat(30) + '\r')

    await upsert(
      db,
      'pco.plans',
      ['id', 'service_type_id', 'title', 'series_title', 'dates', 'sort_date', 'plan_people_count', 'is_public', 'pco_created_at', 'pco_updated_at', 'synced_at'],
      rows,
    )
    return { recordsSeen: rows.length }
  })
}

// ── Plan people (the behavioural signal) ─────────────────────────────────────

type PlanPersonAttrs = {
  status: string | null
  team_position_name: string | null
  decline_reason: string | null
  notes: string | null
  created_at: string | null
  updated_at: string | null
}
type PlanPersonRels = {
  person: { data: { id: string; type: string } | null }
  team: { data: { id: string; type: string } | null }
}

/**
 * One request per plan — this is the expensive part of the Services sync.
 * Only plans already loaded into pco.plans are visited, so the window chosen
 * in syncPlans() controls the cost.
 */
export async function syncPlanPeople(): Promise<SyncResult> {
  return withSyncState('pco.plan_people', async () => {
    const db = getPool()
    const validPeople = await loadValidPeople()

    const { rows: plans } = await db.query<{ id: string; service_type_id: string }>(
      `select id::text, service_type_id::text
         from pco.plans
        where service_type_id is not null
        order by sort_date desc nulls last`,
    )

    let seen = 0
    let skipped = 0
    let done = 0
    let watermark: string | null = null
    let buffer: unknown[][] = []

    const flush = async () => {
      if (buffer.length === 0) return
      await upsert(
        db,
        'pco.plan_people',
        ['id', 'plan_id', 'person_id', 'team_id', 'team_position_name', 'status', 'decline_reason', 'notes', 'pco_created_at', 'pco_updated_at', 'synced_at'],
        buffer,
      )
      buffer = []
    }

    for (const plan of plans) {
      for await (const page of paginate<PcoResource<PlanPersonAttrs, PlanPersonRels>>(
        `/services/v2/service_types/${plan.service_type_id}/plans/${plan.id}/team_members`,
      )) {
        for (const pp of page.data) {
          const personId = pp.relationships?.person?.data?.id
          if (!personId || !validPeople.has(personId)) {
            skipped++
            continue
          }

          const a = pp.attributes
          buffer.push([
            Number(pp.id),
            Number(plan.id),
            Number(personId),
            pp.relationships?.team?.data?.id ? Number(pp.relationships.team.data.id) : null,
            nullIfEmpty(a.team_position_name),
            nullIfEmpty(a.status),
            nullIfEmpty(a.decline_reason),
            nullIfEmpty(a.notes),
            toDate(a.created_at),
            toDate(a.updated_at),
            new Date(),
          ])
          watermark = maxWatermark(watermark, a.updated_at)
          seen++
        }
      }

      done++
      if (buffer.length >= 500) await flush()
      process.stdout.write(`\r  plan people: ${seen}  (plan ${done}/${plans.length})`)
    }

    await flush()
    process.stdout.write('\r' + ' '.repeat(60) + '\r')

    if (skipped > 0) console.log(`  \x1b[2m${skipped} scheduling(s) skipped — person not in pco.people\x1b[0m`)
    return { recordsSeen: seen, watermark }
  })
}

// ── Orchestration ────────────────────────────────────────────────────────────

export async function syncServicesAll(since: Date): Promise<Record<string, SyncResult>> {
  const serviceTypes = await syncServiceTypes()
  const teams = await syncTeams()
  const { positions, assignments } = await syncTeamDetail()
  const plans = await syncPlans(since)
  const planPeople = await syncPlanPeople()
  return { serviceTypes, teams, positions, assignments, plans, planPeople }
}
