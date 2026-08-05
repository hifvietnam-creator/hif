/**
 * scripts/inspect-fields.ts
 *
 * Lists PCO custom field definitions so you can decide which are safe to
 * mirror — BEFORE any field values are copied into the analytics database.
 *
 * PCO custom fields are free-form and churches routinely use them for
 * counseling notes, prayer requests, family circumstances, immigration status
 * and similar. Once such data is copied it also lives in every backup, so the
 * decision to copy has to be deliberate and per-field.
 *
 * This script reads ONLY definitions (names and types). It never reads or
 * writes field values. Sampling a value would defeat the point.
 *
 * Output: a proposed allowlist you edit, then hand to the field_data sync.
 *
 * Usage:
 *   pnpm inspect:fields
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
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

const { paginate } = await import('../src/lib/pco')
type PcoRes = import('../src/lib/pco').PcoResource

type TabAttrs = { name: string | null; sequence: number | null }
type DefAttrs = {
  name: string | null
  slug: string | null
  data_type: string | null
  sequence: number | null
  deleted_at: string | null
  config: string | null
}
type DefRels = { tab: { data: { id: string; type: string } | null } }

// Words that suggest a field may hold sensitive personal information.
// Deliberately broad — this is a prompt to look, not an automated verdict.
const SENSITIVE_HINTS = [
  'note', 'notes', 'counsel', 'prayer', 'medical', 'health', 'allerg',
  'diagnos', 'medication', 'therapy', 'crisis', 'safeguard', 'abuse',
  'divorce', 'marital', 'family situation', 'income', 'salary', 'financial',
  'debt', 'visa', 'immigration', 'passport', 'legal', 'criminal', 'discipline',
  'confidential', 'private', 'sensitive',
]

const looksSensitive = (name: string) => {
  const n = name.toLowerCase()
  return SENSITIVE_HINTS.filter((h) => n.includes(h))
}

console.log('\n\x1b[1mPCO custom field definitions\x1b[0m')
console.log('\x1b[2mReading definitions only. No field values are fetched.\x1b[0m\n')

// ── Tabs (field groups) ──────────────────────────────────────────────────────

const tabs = new Map<string, string>()
try {
  for await (const page of paginate<PcoRes<TabAttrs>>('/people/v2/tabs')) {
    for (const t of page.data) tabs.set(t.id, t.attributes.name ?? `Tab ${t.id}`)
  }
} catch (err) {
  console.log(`  \x1b[2mcould not read tabs: ${err instanceof Error ? err.message : err}\x1b[0m`)
}

// ── Definitions ──────────────────────────────────────────────────────────────

type Row = { id: string; name: string; slug: string; type: string; tab: string; flags: string[] }
const defs: Row[] = []

for await (const page of paginate<PcoRes<DefAttrs, DefRels>>('/people/v2/field_definitions')) {
  for (const d of page.data) {
    if (d.attributes.deleted_at) continue
    const name = d.attributes.name ?? '(unnamed)'
    defs.push({
      id: d.id,
      name,
      slug: d.attributes.slug ?? '',
      type: d.attributes.data_type ?? '',
      tab: tabs.get(d.relationships?.tab?.data?.id ?? '') ?? '—',
      flags: looksSensitive(name),
    })
  }
}

if (defs.length === 0) {
  console.log('  No custom field definitions found.\n')
  process.exit(0)
}

// ── Report ───────────────────────────────────────────────────────────────────

const byTab = new Map<string, Row[]>()
for (const d of defs) {
  if (!byTab.has(d.tab)) byTab.set(d.tab, [])
  byTab.get(d.tab)!.push(d)
}

let flaggedCount = 0

for (const [tab, rows] of [...byTab.entries()].sort()) {
  console.log(`  \x1b[1m${tab}\x1b[0m`)
  for (const r of rows) {
    const flagged = r.flags.length > 0
    if (flagged) flaggedCount++
    const marker = flagged ? '\x1b[33m⚠\x1b[0m' : ' '
    const type = `\x1b[2m${r.type}\x1b[0m`
    const why = flagged ? `  \x1b[33m← matches: ${r.flags.join(', ')}\x1b[0m` : ''
    console.log(`   ${marker} ${r.id.padEnd(9)} ${r.name.padEnd(38)} ${type}${why}`)
  }
  console.log()
}

console.log(`  ${defs.length} active field definition(s), ${flaggedCount} flagged for review.\n`)

// ── Proposed allowlist ───────────────────────────────────────────────────────
// Default to excluding everything. Opting a field IN should be a deliberate
// act, because the cost of wrongly including pastoral data is much higher than
// the cost of wrongly excluding a date.

const OUT = resolve(ROOT, 'config')
mkdirSync(OUT, { recursive: true })
const allowlistPath = resolve(OUT, 'pco-field-allowlist.json')

const proposed = {
  _comment:
    'Fields listed with "include": true will be mirrored into pco.field_data. ' +
    'Everything defaults to false. Review each one before enabling it — this ' +
    'file is the only thing standing between pastoral notes and the analytics ' +
    'database (and every backup of it).',
  _reviewedBy: '',
  _reviewedAt: '',
  fields: defs.map((d) => ({
    id: d.id,
    name: d.name,
    type: d.type,
    tab: d.tab,
    include: false,
    flaggedAs: d.flags.length ? d.flags : undefined,
  })),
}

writeFileSync(allowlistPath, JSON.stringify(proposed, null, 2), 'utf8')

console.log(`  Proposed allowlist written to config/pco-field-allowlist.json`)
console.log('  \x1b[2mEverything defaults to include: false. Set the ones you want to true,')
console.log('  fill in _reviewedBy, then the field_data sync will honour it.\x1b[0m\n')
