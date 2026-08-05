/**
 * scripts/sync-pco-people.ts
 *
 * Backfills pco.campuses, pco.people and pco.emails from Planning Center,
 * then reconciles what landed against what PCO reports.
 *
 * Run locally, not on Vercel — a full sweep takes minutes and would hit the
 * serverless timeout. Incremental runs are small enough for cron later.
 *
 * Usage:
 *   pnpm sync:people              full backfill
 *   pnpm sync:people --incremental  only records changed since last watermark
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

const { syncPeopleAll } = await import('../src/lib/sync/pco-people')
const { getPool, closePool } = await import('../src/lib/db')
const { count: pcoCount } = await import('../src/lib/pco')

const incremental = process.argv.includes('--incremental')

const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const warn = (m: string) => console.log(`  \x1b[33m⚠\x1b[0m ${m}`)

console.log(`\n\x1b[1mPCO People sync\x1b[0m  (${incremental ? 'incremental' : 'full backfill'})\n`)

const started = Date.now()

try {
  const result = await syncPeopleAll(incremental)

  ok(`campuses  ${result.campuses.recordsSeen}`)
  ok(`people    ${result.people.recordsSeen}`)
  ok(`emails    ${result.emails.recordsSeen}`)

  // ── Reconcile ──────────────────────────────────────────────────────────────
  // Row counts alone prove nothing: a sync that silently dropped half the
  // records still "succeeds". Compare against what PCO itself reports.

  console.log('\n\x1b[1mReconciliation\x1b[0m\n')

  const db = getPool()
  const dbCount = async (table: string) => {
    const { rows } = await db.query<{ n: string }>(`select count(*)::text as n from ${table}`)
    return parseInt(rows[0]!.n, 10)
  }

  const localPeople = await dbCount('pco.people')
  const localEmails = await dbCount('pco.emails')

  if (!incremental) {
    const remotePeople = await pcoCount('/people/v2/people')
    const remoteEmails = await pcoCount('/people/v2/emails')

    const compare = (label: string, local: number, remote: number) => {
      const delta = local - remote
      if (delta === 0) ok(`${label.padEnd(10)} ${local} = PCO ${remote}`)
      else warn(`${label.padEnd(10)} ${local} vs PCO ${remote}  (${delta > 0 ? '+' : ''}${delta})`)
    }

    compare('people', localPeople, remotePeople)
    compare('emails', localEmails, remoteEmails)
  } else {
    ok(`people    ${localPeople} rows in database`)
    ok(`emails    ${localEmails} rows in database`)
  }

  // Membership distribution — should match the diagnostic run.
  const { rows: membership } = await db.query<{ membership: string | null; n: string }>(
    `select membership, count(*)::text as n
       from pco.people
      group by membership
      order by count(*) desc`,
  )

  console.log('\n  Membership distribution:')
  for (const r of membership) {
    console.log(`    ${(r.membership ?? '(none)').padEnd(22)} ${r.n.padStart(6)}`)
  }

  // The shared-inbox check that shaped hif.email_links.
  const { rows: shared } = await db.query<{ addresses: string; records: string }>(
    `select count(distinct address)::text as addresses, count(*)::text as records
       from pco.emails`,
  )
  const addresses = parseInt(shared[0]!.addresses, 10)
  const records = parseInt(shared[0]!.records, 10)
  console.log(
    `\n  ${records} email records across ${addresses} distinct addresses ` +
      `(${records - addresses} shared).`,
  )

  console.log(`\n  Done in ${((Date.now() - started) / 1000).toFixed(1)}s\n`)
} catch (err) {
  console.error(`\n\x1b[31m✗ ${err instanceof Error ? err.message : String(err)}\x1b[0m\n`)
  process.exitCode = 1
} finally {
  await closePool()
}
