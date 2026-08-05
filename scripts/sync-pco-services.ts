/**
 * scripts/sync-pco-services.ts
 *
 * Backfills PCO Services: service types, teams, positions, standing team
 * assignments, plans and per-plan scheduling.
 *
 * Cost warning: plan team-members is ONE REQUEST PER PLAN, and there are ~384
 * plans in a single service type across 8 service types. A full-history sync
 * is thousands of requests. The --months window keeps that proportional.
 *
 * Usage:
 *   pnpm sync:services                 last 12 months (default)
 *   pnpm sync:services --months 24     wider window
 *   pnpm sync:services --months 0      all history (slow — expect 15+ minutes)
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

const { syncServicesAll } = await import('../src/lib/sync/pco-services')
const { getPool, closePool } = await import('../src/lib/db')

const monthsArg = process.argv.indexOf('--months')
const months = monthsArg >= 0 ? parseInt(process.argv[monthsArg + 1] ?? '12', 10) : 12

const since = new Date()
if (months > 0) since.setMonth(since.getMonth() - months)
else since.setFullYear(1900)

console.log(
  `\n\x1b[1mPCO Services sync\x1b[0m  ` +
    `(plans from ${months > 0 ? since.toISOString().slice(0, 10) : 'all history'})\n`,
)

const started = Date.now()

try {
  const r = await syncServicesAll(since)

  console.log(`\n  \x1b[32m✓\x1b[0m service types     ${r.serviceTypes!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m teams             ${r.teams!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m team positions    ${r.positions!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m team assignments  ${r.assignments!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m plans             ${r.plans!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m plan people       ${r.planPeople!.recordsSeen}`)

  const db = getPool()

  // ── Who actually serves ────────────────────────────────────────────────────
  // The distinction the custom fields cannot make: on a rota vs actually
  // turning up.

  const { rows: standing } = await db.query<{ n: string }>(
    'select count(distinct person_id)::text as n from pco.team_assignments',
  )
  const { rows: scheduled } = await db.query<{ n: string }>(
    'select count(distinct person_id)::text as n from pco.plan_people',
  )
  const { rows: confirmed } = await db.query<{ n: string }>(
    `select count(distinct person_id)::text as n from pco.plan_people where status = 'C'`,
  )

  console.log('\n\x1b[1mServing population\x1b[0m\n')
  console.log(`  on a team rota          ${standing[0]!.n.padStart(6)}`)
  console.log(`  scheduled at least once ${scheduled[0]!.n.padStart(6)}`)
  console.log(`  confirmed at least once ${confirmed[0]!.n.padStart(6)}`)
  console.log(
    '\n  \x1b[2mCompare with ~210 people in the "Volunteer in Ministry" custom field.\x1b[0m',
  )

  const { rows: statuses } = await db.query<{ status: string; n: string }>(
    `select coalesce(status,'(none)') as status, count(*)::text as n
       from pco.plan_people group by 1 order by count(*) desc`,
  )
  console.log('\n  Scheduling status breakdown:')
  for (const s of statuses) console.log(`    ${s.status.padEnd(10)} ${s.n.padStart(7)}`)

  const { rows: byTeam } = await db.query<{ name: string; people: string; slots: string }>(
    `select t.name,
            count(distinct pp.person_id)::text as people,
            count(*)::text as slots
       from pco.plan_people pp
       join pco.teams t on t.id = pp.team_id
      group by t.name
      order by count(*) desc
      limit 20`,
  )
  if (byTeam.length > 0) {
    console.log('\n  Busiest teams (by scheduled slots):\n')
    console.log('    ' + 'team'.padEnd(34) + 'people'.padStart(8) + 'slots'.padStart(8))
    console.log('    ' + '─'.repeat(50))
    for (const t of byTeam) {
      console.log('    ' + (t.name ?? '—').slice(0, 33).padEnd(34) + t.people.padStart(8) + t.slots.padStart(8))
    }
  }

  console.log(`\n  Done in ${((Date.now() - started) / 1000).toFixed(1)}s\n`)
} catch (err) {
  console.error(`\n\x1b[31m✗ ${err instanceof Error ? err.message : String(err)}\x1b[0m\n`)
  process.exitCode = 1
} finally {
  await closePool()
}
