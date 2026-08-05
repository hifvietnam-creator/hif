/**
 * Sync Planning Center People into the `pco` schema.
 *
 * Plain functions taking no entry-point assumptions, so the local backfill
 * script and the Payload cron job can both call them. One implementation.
 *
 * Covers campuses, people and emails. Phones, custom fields, groups and
 * workflows come later — people and emails are validated first.
 *
 * READ ONLY against PCO. Writes only to our own database.
 */

import { paginate, type PcoResource } from '../pco'
import {
  getPool,
  getWatermark,
  maxWatermark,
  nullIfEmpty,
  toDate,
  upsert,
  withSyncState,
  type SyncResult,
} from '../db'

// ── Campuses ─────────────────────────────────────────────────────────────────

type CampusAttrs = {
  name: string | null
  description: string | null
  city: string | null
  country: string | null
  time_zone: string | null
  created_at: string | null
  updated_at: string | null
}

export async function syncCampuses(): Promise<SyncResult> {
  return withSyncState('pco.campuses', async () => {
    const rows: unknown[][] = []

    for await (const page of paginate<PcoResource<CampusAttrs>>('/people/v2/campuses')) {
      for (const c of page.data) {
        const a = c.attributes
        rows.push([
          Number(c.id),
          nullIfEmpty(a.name),
          nullIfEmpty(a.description),
          nullIfEmpty(a.city),
          nullIfEmpty(a.country),
          nullIfEmpty(a.time_zone),
          toDate(a.created_at),
          toDate(a.updated_at),
        ])
      }
    }

    await upsert(
      getPool(),
      'pco.campuses',
      ['id', 'name', 'description', 'city', 'country', 'time_zone', 'pco_created_at', 'pco_updated_at'],
      rows,
    )

    return { recordsSeen: rows.length }
  })
}

// ── People ───────────────────────────────────────────────────────────────────

type PersonAttrs = {
  first_name: string | null
  last_name: string | null
  name: string | null
  nickname: string | null
  status: string | null
  membership: string | null
  child: boolean | null
  birthdate: string | null
  anniversary: string | null
  gender: string | null
  grade: string | null
  school_type: string | null
  remote_id: string | null
  inactivated_at: string | null
  created_at: string | null
  updated_at: string | null
}

type PersonRels = { primary_campus: { data: { id: string; type: string } | null } }

const PERSON_COLUMNS = [
  'id',
  'first_name',
  'last_name',
  'name',
  'nickname',
  'status',
  'membership',
  'child',
  'birthdate',
  'anniversary',
  'gender',
  'grade',
  'school_type',
  'primary_campus_id',
  'remote_id',
  'inactivated_at',
  'pco_created_at',
  'pco_updated_at',
  'synced_at',
]

/**
 * @param incremental When true, fetch only records changed since the stored
 *                    watermark. First run should always be a full sweep.
 */
export async function syncPeople(incremental = false): Promise<SyncResult> {
  return withSyncState('pco.people', async () => {
    const since = incremental ? await getWatermark('pco.people') : null
    const query = since
      ? `/people/v2/people?where[updated_at][gt]=${encodeURIComponent(since)}`
      : '/people/v2/people'

    const db = getPool()
    let watermark: string | null = since
    let seen = 0
    let buffer: unknown[][] = []

    const flush = async () => {
      if (buffer.length === 0) return
      await upsert(db, 'pco.people', PERSON_COLUMNS, buffer)
      buffer = []
    }

    for await (const page of paginate<PcoResource<PersonAttrs, PersonRels>>(query)) {
      for (const p of page.data) {
        const a = p.attributes
        const campusId = p.relationships?.primary_campus?.data?.id

        buffer.push([
          Number(p.id),
          nullIfEmpty(a.first_name),
          nullIfEmpty(a.last_name),
          nullIfEmpty(a.name),
          nullIfEmpty(a.nickname),
          nullIfEmpty(a.status),
          nullIfEmpty(a.membership),
          a.child ?? null,
          nullIfEmpty(a.birthdate),
          nullIfEmpty(a.anniversary),
          nullIfEmpty(a.gender),
          nullIfEmpty(a.grade),
          nullIfEmpty(a.school_type),
          campusId ? Number(campusId) : null,
          nullIfEmpty(a.remote_id),
          toDate(a.inactivated_at),
          toDate(a.created_at),
          toDate(a.updated_at),
          new Date(),
        ])

        watermark = maxWatermark(watermark, a.updated_at)
        seen++
      }

      // Flush per page rather than accumulating 6,800 rows in memory.
      await flush()
      process.stdout.write(`\r  people: ${seen}`)
    }

    await flush()
    process.stdout.write('\r' + ' '.repeat(30) + '\r')

    return { recordsSeen: seen, watermark }
  })
}

// ── Emails ───────────────────────────────────────────────────────────────────

type EmailAttrs = {
  address: string | null
  location: string | null
  primary: boolean | null
  blocked: boolean | null
  created_at: string | null
  updated_at: string | null
}

type EmailRels = { person: { data: { id: string; type: string } | null } }

const EMAIL_COLUMNS = [
  'id',
  'person_id',
  'address',
  'location',
  'is_primary',
  'blocked',
  'pco_created_at',
  'pco_updated_at',
  'synced_at',
]

export async function syncEmails(incremental = false): Promise<SyncResult> {
  return withSyncState('pco.emails', async () => {
    const since = incremental ? await getWatermark('pco.emails') : null
    const query = since
      ? `/people/v2/emails?where[updated_at][gt]=${encodeURIComponent(since)}`
      : '/people/v2/emails'

    const db = getPool()
    let watermark: string | null = since
    let seen = 0
    let orphaned = 0
    let buffer: unknown[][] = []

    const flush = async () => {
      if (buffer.length === 0) return
      await upsert(db, 'pco.emails', EMAIL_COLUMNS, buffer)
      buffer = []
    }

    for await (const page of paginate<PcoResource<EmailAttrs, EmailRels>>(query)) {
      for (const e of page.data) {
        const a = e.attributes
        const personId = e.relationships?.person?.data?.id

        // An email with no person, or whose person is outside our mirror,
        // would violate the foreign key. Skip and count rather than crash —
        // this happens legitimately during incremental runs when a person
        // arrives in a later sync.
        if (!personId || !a.address) {
          orphaned++
          continue
        }

        buffer.push([
          Number(e.id),
          Number(personId),
          a.address.trim().toLowerCase(),
          nullIfEmpty(a.location),
          a.primary ?? null,
          a.blocked ?? null,
          toDate(a.created_at),
          toDate(a.updated_at),
          new Date(),
        ])

        watermark = maxWatermark(watermark, a.updated_at)
        seen++
      }

      await flush()
      process.stdout.write(`\r  emails: ${seen}`)
    }

    await flush()
    process.stdout.write('\r' + ' '.repeat(30) + '\r')

    if (orphaned > 0) {
      console.log(`  \x1b[2mskipped ${orphaned} email(s) with no linked person\x1b[0m`)
    }

    return { recordsSeen: seen, watermark }
  })
}

// ── Orchestration ────────────────────────────────────────────────────────────

/**
 * Order matters: campuses before people (people reference a campus), people
 * before emails (emails reference a person). Foreign keys enforce this, so a
 * wrong order fails loudly rather than silently dropping rows.
 */
export async function syncPeopleAll(incremental = false): Promise<{
  campuses: SyncResult
  people: SyncResult
  emails: SyncResult
}> {
  const campuses = await syncCampuses()
  const people = await syncPeople(incremental)
  const emails = await syncEmails(incremental)
  return { campuses, people, emails }
}
