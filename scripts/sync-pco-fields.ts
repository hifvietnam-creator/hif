/**
 * scripts/sync-pco-fields.ts
 *
 * Syncs PCO custom field definitions, and values for allowlisted fields only.
 * Requires config/pco-field-allowlist.json with a "_reviewedBy" owner set —
 * the sync refuses to run otherwise.
 *
 * Usage:
 *   pnpm sync:fields
 *   pnpm sync:fields --incremental
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

const { syncFieldsAll, loadAllowlist } = await import('../src/lib/sync/pco-fields')
const { getPool, closePool } = await import('../src/lib/db')

const incremental = process.argv.includes('--incremental')

console.log(`\n\x1b[1mPCO custom fields\x1b[0m  (${incremental ? 'incremental' : 'full'})\n`)

try {
  const { allowed, names } = loadAllowlist(resolve(ROOT, 'config', 'pco-field-allowlist.json'))
  console.log(`  Allowlist: ${allowed.size} of ${names.size} fields enabled\n`)

  const result = await syncFieldsAll(incremental)

  console.log(`\n  \x1b[32m✓\x1b[0m definitions  ${result.definitions.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m values       ${result.values.recordsSeen}`)

  // ── What actually landed, per field ────────────────────────────────────────
  // Counts only. Values are never printed — the point of the allowlist is that
  // this data stays where it belongs.

  const db = getPool()
  const { rows } = await db.query<{ name: string; n: string; filled: string }>(
    `select d.name,
            count(*)::text as n,
            count(nullif(trim(fd.value), ''))::text as filled
       from pco.field_data fd
       join pco.field_definitions d on d.id = fd.field_definition_id
      group by d.name
      order by count(*) desc`,
  )

  if (rows.length > 0) {
    console.log('\n  Coverage by field (row counts only, no values):\n')
    console.log('    ' + 'field'.padEnd(46) + 'rows'.padStart(7) + 'non-empty'.padStart(11))
    console.log('    ' + '─'.repeat(64))
    for (const r of rows) {
      console.log(
        '    ' + r.name.slice(0, 45).padEnd(46) + r.n.padStart(7) + r.filled.padStart(11),
      )
    }
  }

  // The highest-value field deserves its own check: how many people actually
  // have a join date, and what range does it cover?
  const { rows: joined } = await db.query<{ n: string; earliest: string; latest: string }>(
    `select count(*)::text as n,
            min(value) as earliest,
            max(value) as latest
       from pco.field_data fd
       join pco.field_definitions d on d.id = fd.field_definition_id
      where d.name = 'Date Joined/started attending HIF'
        and nullif(trim(fd.value), '') is not null`,
  )
  if (joined[0] && parseInt(joined[0].n, 10) > 0) {
    console.log(
      `\n  "Date Joined" populated for ${joined[0].n} people ` +
        `(${joined[0].earliest} → ${joined[0].latest})`,
    )
  }

  console.log()
} catch (err) {
  console.error(`\n\x1b[31m✗ ${err instanceof Error ? err.message : String(err)}\x1b[0m\n`)
  process.exitCode = 1
} finally {
  await closePool()
}
