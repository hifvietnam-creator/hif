/**
 * Sync Planning Center Groups into the `pco` schema.
 *
 * Distinct from the existing Payload `groups` collection, which drives the
 * public website and is edited by staff. This mirror includes unlisted and
 * archived groups the website deliberately hides, plus the memberships that
 * the website has no reason to know about.
 *
 * Groups matters more than it first appeared: Services turned out to cover
 * only worship and media scheduling, so group LEADERS are a serving signal
 * that exists nowhere else.
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

async function loadValidPeople(): Promise<Set<string>> {
  const { rows } = await getPool().query<{ id: string }>('select id::text from pco.people')
  return new Set(rows.map((r) => r.id))
}

/**
 * Convert a JSON-API id to bigint, failing with context rather than silently
 * producing NaN.
 *
 * `Number('unique')` is NaN, which Postgres rejects with a message that names
 * only the column type — useless for finding which endpoint sent it. This says
 * exactly what came from where.
 */
function toId(raw: unknown, context: string): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    throw new Error(
      `[groups] Non-numeric ID from ${context}: ${JSON.stringify(raw)}. ` +
        'If this is a legitimate PCO identifier, the column must be text rather than bigint.',
    )
  }
  return n
}


// ── Group types ──────────────────────────────────────────────────────────────

type GroupTypeAttrs = {
  name: string | null
  church_center_visible: boolean | null
  created_at: string | null
}

export async function syncGroupTypes(): Promise<SyncResult> {
  return withSyncState('pco.group_types', async () => {
    const rows: unknown[][] = []
    for await (const page of paginate<PcoResource<GroupTypeAttrs>>('/groups/v2/group_types')) {
      for (const g of page.data) {
        rows.push([
          // Text, not numeric: PCO issues a sentinel type with id "unique".
          String(g.id),
          nullIfEmpty(g.attributes.name),
          g.attributes.church_center_visible ?? null,
          toDate(g.attributes.created_at),
          new Date(),
        ])
      }
    }
    await upsert(
      getPool(),
      'pco.group_types',
      ['id', 'name', 'church_center_visible', 'pco_created_at', 'synced_at'],
      rows,
    )
    return { recordsSeen: rows.length }
  })
}

// ── Groups ───────────────────────────────────────────────────────────────────

type GroupAttrs = {
  name: string | null
  description: string | null
  schedule: string | null
  contact_email: string | null
  public_church_center_web_url: string | null
  location_type_preference: string | null
  enrollment_open: boolean | null
  listed: boolean | null
  memberships_count: number | null
  archived_at: string | null
  created_at: string | null
}
type GroupRels = { group_type: { data: { id: string; type: string } | null } }

export async function syncGroups(): Promise<SyncResult> {
  return withSyncState('pco.groups', async () => {
    const rows: unknown[][] = []

    // No `listed` filter — the analytical mirror wants unlisted and archived
    // groups too. The website's copy is the one that filters.
    for await (const page of paginate<PcoResource<GroupAttrs, GroupRels>>(
      '/groups/v2/groups?include=group_type',
    )) {
      for (const g of page.data) {
        const a = g.attributes
        rows.push([
          toId(g.id, 'groups.id'),
          nullIfEmpty(a.name),
          g.relationships?.group_type?.data?.id
            ? String(g.relationships.group_type.data.id)
            : null,
          nullIfEmpty(a.description),
          nullIfEmpty(a.schedule),
          nullIfEmpty(a.contact_email),
          nullIfEmpty(a.public_church_center_web_url),
          nullIfEmpty(a.location_type_preference),
          a.enrollment_open ?? null,
          a.listed ?? null,
          a.memberships_count ?? null,
          toDate(a.archived_at),
          toDate(a.created_at),
          null,
          new Date(),
        ])
      }
    }

    await upsert(
      getPool(),
      'pco.groups',
      ['id', 'name', 'group_type_id', 'description', 'schedule', 'contact_email', 'church_center_url', 'location_type', 'enrollment_open', 'listed', 'memberships_count', 'archived_at', 'pco_created_at', 'pco_updated_at', 'synced_at'],
      rows,
    )
    return { recordsSeen: rows.length }
  })
}

// ── Memberships ──────────────────────────────────────────────────────────────
// Nested per group. This is where the Groups-API-person-ID assumption finally
// gets tested — IDs are validated against pco.people rather than trusted, the
// same guard that caught the polymorphic customizable relationship.

type MembershipAttrs = {
  role: string | null
  joined_at: string | null
  created_at: string | null
  updated_at: string | null
}
type MembershipRels = { person: { data: { id: string; type: string } | null } }

export async function syncGroupMemberships(): Promise<SyncResult> {
  return withSyncState('pco.group_memberships', async () => {
    const db = getPool()
    const validPeople = await loadValidPeople()

    const { rows: groups } = await db.query<{ id: string }>(
      'select id::text from pco.groups order by id',
    )

    let seen = 0
    let skipped = 0
    let watermark: string | null = null
    const unknownIds = new Set<string>()
    let buffer: unknown[][] = []

    const flush = async () => {
      if (buffer.length === 0) return
      await upsert(
        db,
        'pco.group_memberships',
        ['id', 'group_id', 'person_id', 'role', 'joined_at', 'pco_created_at', 'pco_updated_at', 'synced_at'],
        buffer,
      )
      buffer = []
    }

    for (const g of groups) {
      for await (const page of paginate<PcoResource<MembershipAttrs, MembershipRels>>(
        `/groups/v2/groups/${g.id}/memberships`,
      )) {
        for (const m of page.data) {
          const personId = m.relationships?.person?.data?.id
          if (!personId || !validPeople.has(personId)) {
            if (personId) unknownIds.add(personId)
            skipped++
            continue
          }

          const a = m.attributes
          buffer.push([
            toId(m.id, `memberships.id (group ${g.id})`),
            toId(g.id, 'memberships.group_id'),
            toId(personId, 'memberships.relationships.person'),
            nullIfEmpty(a.role),
            toDate(a.joined_at),
            toDate(a.created_at),
            toDate(a.updated_at),
            new Date(),
          ])
          watermark = maxWatermark(watermark, a.updated_at)
          seen++
        }
      }
      if (buffer.length >= 500) await flush()
      process.stdout.write(`\r  memberships: ${seen}`)
    }

    await flush()
    process.stdout.write('\r' + ' '.repeat(40) + '\r')

    if (skipped > 0) {
      console.log(`  \x1b[33m${skipped} membership(s) skipped — person not in pco.people\x1b[0m`)
      if (unknownIds.size > 0) {
        console.log(
          `  \x1b[2m${unknownIds.size} distinct unknown ID(s), e.g. ` +
            `${[...unknownIds].slice(0, 5).join(', ')}\x1b[0m`,
        )
        console.log(
          '  \x1b[2mIf this is a large number, the Groups API may not share the\n' +
            '  People ID space and the schema needs revisiting.\x1b[0m',
        )
      }
    }

    return { recordsSeen: seen, watermark }
  })
}

export async function syncGroupsAll(): Promise<Record<string, SyncResult>> {
  const groupTypes = await syncGroupTypes()
  const groups = await syncGroups()
  const memberships = await syncGroupMemberships()
  return { groupTypes, groups, memberships }
}
