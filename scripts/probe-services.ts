/**
 * scripts/probe-services.ts
 *
 * Asks the live PCO account which Services endpoints exist and what shape they
 * return, instead of guessing from documentation that renders client-side.
 *
 * Written because guessing already cost us once: field_data.customizable
 * turned out to be polymorphic and blew up a foreign key mid-sync.
 *
 * Read-only. Fetches one record per endpoint. Prints attribute names and
 * relationship names only — never attribute VALUES, so nothing personal is
 * echoed to the terminal.
 *
 * Usage:
 *   pnpm probe:services
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function loadEnv() {
  try {
    const envFile = readFileSync(resolve(ROOT, '.env'), 'utf8')
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim()
    }
  } catch {}
}
loadEnv()

const { get } = await import('../src/lib/pco')

type Rec = {
  id: string
  type: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, { data: { id: string; type: string } | null }>
}
type Payload = { data: Rec | Rec[]; meta?: { total_count?: number } }

const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const bad = (m: string) => console.log(`  \x1b[31m✗\x1b[0m ${m}`)

/** Fetch one record and describe its shape. Returns the record for chaining. */
async function probe(label: string, path: string): Promise<Rec | null> {
  try {
    const res = await get<Payload>(`${path}${path.includes('?') ? '&' : '?'}per_page=1`)
    const rec = Array.isArray(res.data) ? res.data[0] : res.data
    const total = res.meta?.total_count

    ok(`${label.padEnd(28)} ${path}`)
    if (total !== undefined) console.log(`      total_count: ${total}`)

    if (!rec) {
      console.log('      \x1b[2m(endpoint exists but returned no records)\x1b[0m')
      return null
    }

    console.log(`      type: ${rec.type}`)
    console.log(`      attributes:    ${Object.keys(rec.attributes ?? {}).join(', ') || '—'}`)

    const rels = rec.relationships ?? {}
    const relDesc = Object.entries(rels)
      .map(([name, v]) => `${name}${v?.data?.type ? `→${v.data.type}` : ''}`)
      .join(', ')
    console.log(`      relationships: ${relDesc || '—'}`)
    console.log()
    return rec
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    bad(`${label.padEnd(28)} ${path}`)
    console.log(`      \x1b[2m${msg.slice(0, 140)}\x1b[0m\n`)
    return null
  }
}

console.log('\n\x1b[1mPCO Services — endpoint discovery\x1b[0m')
console.log('\x1b[2mOne record per endpoint. Field NAMES only, never values.\x1b[0m\n')

// ── Top-level collections ────────────────────────────────────────────────────

const serviceType = await probe('service_types', '/services/v2/service_types')
const team = await probe('teams', '/services/v2/teams')
await probe('people (Services view)', '/services/v2/people')
await probe('team_positions', '/services/v2/team_positions')

// ── Nested: does standing assignment live under team or person? ──────────────

if (team) {
  await probe('team → positions', `/services/v2/teams/${team.id}/team_positions`)
  await probe(
    'team → assignments',
    `/services/v2/teams/${team.id}/person_team_position_assignments`,
  )
  await probe('team → people', `/services/v2/teams/${team.id}/people`)
}

// ── Nested: plans and who was scheduled ──────────────────────────────────────

let planId: string | null = null
if (serviceType) {
  const plan = await probe(
    'service_type → plans',
    `/services/v2/service_types/${serviceType.id}/plans?order=-sort_date`,
  )
  planId = plan?.id ?? null

  if (planId) {
    await probe(
      'plan → team_members',
      `/services/v2/service_types/${serviceType.id}/plans/${planId}/team_members`,
    )
    await probe(
      'plan → plan_times',
      `/services/v2/service_types/${serviceType.id}/plans/${planId}/plan_times`,
    )
  }
}

// ── The ID-space question ────────────────────────────────────────────────────
// Does a Services person ID also resolve in the People API? If not, every
// person_id foreign key in 007_pco_services.sql is wrong.

console.log('\x1b[1mID space check\x1b[0m\n')

try {
  const sp = await get<Payload>('/services/v2/people?per_page=1')
  const rec = Array.isArray(sp.data) ? sp.data[0] : sp.data
  if (!rec) {
    console.log('  \x1b[2mNo Services people to test with.\x1b[0m\n')
  } else {
    try {
      await get<Payload>(`/people/v2/people/${rec.id}`)
      ok(`Services person ${rec.id} resolves in the People API — same ID space.`)
      console.log('      \x1b[2mForeign keys to pco.people are safe.\x1b[0m\n')
    } catch {
      bad(`Services person ${rec.id} does NOT resolve in the People API.`)
      console.log(
        '      \x1b[33mThe ID spaces differ. 007_pco_services.sql needs its\n' +
          '      person_id foreign keys removed before syncing.\x1b[0m\n',
      )
    }
  }
} catch (err) {
  bad(`ID space check failed: ${err instanceof Error ? err.message : err}`)
}

console.log('\x1b[2mUse this output to confirm the sync module before writing it.\x1b[0m\n')
