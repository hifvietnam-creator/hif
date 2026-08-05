/**
 * Sync PCO custom field definitions and (allowlisted) field values.
 *
 * Two different privacy postures on purpose:
 *
 *   - DEFINITIONS are always mirrored. Names and data types are metadata;
 *     knowing what fields exist is how you notice a new sensitive one appearing.
 *   - VALUES are mirrored only for fields marked include:true in
 *     config/pco-field-allowlist.json. A field absent from that file is
 *     treated as excluded, so a newly-created PCO field cannot leak in
 *     silently — it will show up as a warning instead.
 *
 * Note: PCO has no server-side filter for field_data by definition, so
 * excluded values do transit through memory during a sweep. They are dropped
 * immediately and never written, logged, or persisted anywhere.
 *
 * READ ONLY against PCO.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

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

// ── Allowlist ────────────────────────────────────────────────────────────────

type AllowlistEntry = { id: string; name: string; include: boolean }
type Allowlist = { fields: AllowlistEntry[]; _reviewedBy?: string }

let cached: { allowed: Set<string>; names: Map<string, string> } | null = null

export function loadAllowlist(configPath?: string): {
  allowed: Set<string>
  names: Map<string, string>
} {
  if (cached) return cached

  const path = configPath ?? resolve(process.cwd(), 'config', 'pco-field-allowlist.json')

  let parsed: Allowlist
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8')) as Allowlist
  } catch {
    throw new Error(
      `[pco-fields] Could not read ${path}. ` +
        'Run `pnpm inspect:fields` first — field values are never synced without an explicit allowlist.',
    )
  }

  if (!parsed._reviewedBy) {
    throw new Error(
      '[pco-fields] The allowlist has no "_reviewedBy" value. ' +
        'Someone must own the decision about which personal data gets copied.',
    )
  }

  const allowed = new Set<string>()
  const names = new Map<string, string>()
  for (const f of parsed.fields ?? []) {
    names.set(f.id, f.name)
    if (f.include) allowed.add(f.id)
  }

  cached = { allowed, names }
  return cached
}

// ── Definitions ──────────────────────────────────────────────────────────────

type DefAttrs = {
  name: string | null
  slug: string | null
  data_type: string | null
  sequence: number | null
  deleted_at: string | null
}
type DefRels = { tab: { data: { id: string; type: string } | null } }

export async function syncFieldDefinitions(): Promise<SyncResult> {
  return withSyncState('pco.field_definitions', async () => {
    const { names } = loadAllowlist()
    const rows: unknown[][] = []
    const unknown: string[] = []

    for await (const page of paginate<PcoResource<DefAttrs, DefRels>>(
      '/people/v2/field_definitions',
    )) {
      for (const d of page.data) {
        const a = d.attributes

        // A definition we've never reviewed. Surface it loudly — this is how
        // a newly-added sensitive field gets noticed rather than silently synced.
        if (!names.has(d.id) && !a.deleted_at) {
          unknown.push(`${d.id} "${a.name}"`)
        }

        rows.push([
          Number(d.id),
          nullIfEmpty(a.name),
          nullIfEmpty(a.slug),
          nullIfEmpty(a.data_type),
          d.relationships?.tab?.data?.id ? Number(d.relationships.tab.data.id) : null,
          a.sequence ?? null,
          toDate(a.deleted_at),
          new Date(),
        ])
      }
    }

    await upsert(
      getPool(),
      'pco.field_definitions',
      ['id', 'name', 'slug', 'data_type', 'tab_id', 'sequence', 'deleted_at', 'synced_at'],
      rows,
    )

    if (unknown.length > 0) {
      console.log(
        `\n  \x1b[33m⚠ ${unknown.length} field definition(s) not in the allowlist:\x1b[0m`,
      )
      for (const u of unknown) console.log(`      ${u}`)
      console.log(
        '  \x1b[2mTheir VALUES are not being synced. Re-run `pnpm inspect:fields`\n' +
          '  and review before enabling any of them.\x1b[0m\n',
      )
    }

    return { recordsSeen: rows.length }
  })
}

// ── Values ───────────────────────────────────────────────────────────────────

type DatumAttrs = {
  value: string | null
  file: string | null
  created_at: string | null
  updated_at: string | null
}

// The person link is `customizable` (polymorphic) on FieldDatum, but older
// payloads expose `person`. Accept either rather than assume.
type DatumRels = {
  field_definition: { data: { id: string; type: string } | null }
  customizable?: { data: { id: string; type: string } | null }
  person?: { data: { id: string; type: string } | null }
}

const DATUM_COLUMNS = [
  'id',
  'person_id',
  'field_definition_id',
  'value',
  'file_url',
  'pco_created_at',
  'pco_updated_at',
  'synced_at',
]

export async function syncFieldData(incremental = false): Promise<SyncResult> {
  return withSyncState('pco.field_data', async () => {
    const { allowed } = loadAllowlist()

    if (allowed.size === 0) {
      console.log('  \x1b[2mNo fields allowlisted — nothing to sync.\x1b[0m')
      return { recordsSeen: 0 }
    }

    const since = incremental ? await getWatermark('pco.field_data') : null
    const query = since
      ? `/people/v2/field_data?where[updated_at][gt]=${encodeURIComponent(since)}`
      : '/people/v2/field_data'

    const db = getPool()

    // `customizable` is polymorphic — a field value can belong to a Person, but
    // also to other entity types. Inserting a non-person ID violates the
    // foreign key, so load the valid set and check membership rather than
    // trusting the relationship blindly.
    const { rows: idRows } = await db.query<{ id: string }>('select id::text from pco.people')
    const validPeople = new Set(idRows.map((r) => r.id))

    let watermark: string | null = since
    let kept = 0
    let excluded = 0
    let unlinked = 0
    let buffer: unknown[][] = []

    // Diagnostics: what did we actually encounter?
    const skippedByType = new Map<string, number>()
    const unknownPersonIds = new Set<string>()
    const relationshipShapes = new Set<string>()

    const flush = async () => {
      if (buffer.length === 0) return
      await upsert(db, 'pco.field_data', DATUM_COLUMNS, buffer)
      buffer = []
    }

    for await (const page of paginate<PcoResource<DatumAttrs, DatumRels>>(query)) {
      for (const d of page.data) {
        const defId = d.relationships?.field_definition?.data?.id

        // Gate BEFORE touching the value.
        if (!defId || !allowed.has(defId)) {
          excluded++
          continue
        }

        relationshipShapes.add(Object.keys(d.relationships ?? {}).sort().join(','))

        // Prefer an explicit `person` link; fall back to `customizable` only
        // when it actually points at a Person.
        const personRef = d.relationships?.person?.data
        const customRef = d.relationships?.customizable?.data

        let personId: string | null = null
        if (personRef?.id) {
          personId = personRef.id
        } else if (customRef?.id) {
          const type = customRef.type ?? '(untyped)'
          if (type === 'Person') {
            personId = customRef.id
          } else {
            skippedByType.set(type, (skippedByType.get(type) ?? 0) + 1)
            unlinked++
            continue
          }
        }

        if (!personId) {
          skippedByType.set('(no link)', (skippedByType.get('(no link)') ?? 0) + 1)
          unlinked++
          continue
        }

        // Even a Person-typed reference may point outside our mirror — someone
        // added between the people sync and this one, or a merged record.
        if (!validPeople.has(personId)) {
          unknownPersonIds.add(personId)
          unlinked++
          continue
        }

        const a = d.attributes
        buffer.push([
          Number(d.id),
          Number(personId),
          Number(defId),
          nullIfEmpty(a.value),
          nullIfEmpty(a.file),
          toDate(a.created_at),
          toDate(a.updated_at),
          new Date(),
        ])

        watermark = maxWatermark(watermark, a.updated_at)
        kept++
      }

      await flush()
      process.stdout.write(`\r  field values: ${kept} kept, ${excluded} excluded`)
    }

    await flush()
    process.stdout.write('\r' + ' '.repeat(50) + '\r')

    console.log(`  \x1b[2m${excluded} value(s) discarded — field not allowlisted.\x1b[0m`)

    if (unlinked > 0) {
      console.log(`  \x1b[33m${unlinked} value(s) skipped — not attached to a known person:\x1b[0m`)
      for (const [type, n] of [...skippedByType.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`      ${String(n).padStart(6)}  customizable type = ${type}`)
      }
      if (unknownPersonIds.size > 0) {
        console.log(
          `      ${String(unknownPersonIds.size).padStart(6)}  person IDs absent from pco.people`,
        )
        console.log(
          `              e.g. ${[...unknownPersonIds].slice(0, 5).join(', ')}` +
            (unknownPersonIds.size > 5 ? ' …' : ''),
        )
        console.log('  \x1b[2m      Re-run `pnpm sync:people` if these are recent additions.\x1b[0m')
      }
    }

    console.log(
      `  \x1b[2mrelationship shapes seen: ${[...relationshipShapes].join(' | ') || 'none'}\x1b[0m`,
    )

    return { recordsSeen: kept, watermark }
  })
}

export async function syncFieldsAll(incremental = false): Promise<{
  definitions: SyncResult
  values: SyncResult
}> {
  const definitions = await syncFieldDefinitions()
  const values = await syncFieldData(incremental)
  return { definitions, values }
}
