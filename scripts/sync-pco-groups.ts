/**
 * scripts/sync-pco-groups.ts
 *
 * Backfills PCO group types, groups and memberships.
 *
 * Note: this replaces the older scripts/pco-sync-groups.ts, which wrote into
 * the Payload `groups` collection for the website. That one still has a job —
 * they populate different tables for different purposes.
 *
 * Usage:
 *   pnpm sync:groups
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

const { syncGroupsAll } = await import('../src/lib/sync/pco-groups')
const { getPool, closePool } = await import('../src/lib/db')

console.log('\n\x1b[1mPCO Groups sync\x1b[0m\n')
const started = Date.now()

try {
  const r = await syncGroupsAll()

  console.log(`\n  \x1b[32m✓\x1b[0m group types  ${r.groupTypes!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m groups       ${r.groups!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m memberships  ${r.memberships!.recordsSeen}`)

  const db = getPool()

  const { rows: byType } = await db.query<{
    name: string
    groups: string
    members: string
    leaders: string
  }>(
    `select gt.name,
            count(distinct g.id)::text  as groups,
            count(distinct gm.person_id)::text as members,
            count(distinct gm.person_id) filter (
              where lower(coalesce(gm.role,'')) like '%leader%'
            )::text as leaders
       from pco.group_types gt
       left join pco.groups g  on g.group_type_id = gt.id
       left join pco.group_memberships gm on gm.group_id = g.id
      group by gt.name
      order by count(distinct gm.person_id) desc`,
  )

  console.log('\n\x1b[1mBy group type\x1b[0m\n')
  console.log('  ' + 'type'.padEnd(28) + 'groups'.padStart(8) + 'people'.padStart(8) + 'leaders'.padStart(9))
  console.log('  ' + '─'.repeat(53))
  for (const r2 of byType) {
    console.log(
      '  ' + (r2.name ?? '—').slice(0, 27).padEnd(28) +
        r2.groups.padStart(8) + r2.members.padStart(8) + r2.leaders.padStart(9),
    )
  }

  // Group leaders are a serving signal that exists nowhere else — Services
  // covers only worship and media.
  const { rows: leaders } = await db.query<{ n: string }>(
    `select count(distinct person_id)::text as n
       from pco.group_memberships
      where lower(coalesce(role,'')) like '%leader%'`,
  )
  const { rows: anyGroup } = await db.query<{ n: string }>(
    'select count(distinct person_id)::text as n from pco.group_memberships',
  )

  console.log(`\n  in at least one group  ${anyGroup[0]!.n.padStart(6)}`)
  console.log(`  leading a group        ${leaders[0]!.n.padStart(6)}   \x1b[2m← serving signal\x1b[0m`)

  // How much of the congregation is actually connected to a group?
  const { rows: coverage } = await db.query<{ membership: string; total: string; in_group: string }>(
    `select coalesce(p.membership,'(none)') as membership,
            count(*)::text as total,
            count(*) filter (where gm.person_id is not null)::text as in_group
       from pco.people p
       left join (select distinct person_id from pco.group_memberships) gm
              on gm.person_id = p.id
      group by 1
      order by count(*) desc
      limit 12`,
  )

  console.log('\n\x1b[1mGroup connection by membership status\x1b[0m\n')
  console.log('  ' + 'status'.padEnd(24) + 'people'.padStart(8) + 'in group'.padStart(10) + '   %')
  console.log('  ' + '─'.repeat(50))
  for (const c of coverage) {
    const total = parseInt(c.total, 10)
    const inGroup = parseInt(c.in_group, 10)
    const pct = total > 0 ? ((inGroup / total) * 100).toFixed(0) + '%' : '—'
    console.log(
      '  ' + c.membership.slice(0, 23).padEnd(24) +
        c.total.padStart(8) + c.in_group.padStart(10) + pct.padStart(5),
    )
  }

  console.log(`\n  Done in ${((Date.now() - started) / 1000).toFixed(1)}s\n`)
} catch (err) {
  console.error(`\n\x1b[31m✗ ${err instanceof Error ? err.message : String(err)}\x1b[0m\n`)
  process.exitCode = 1
} finally {
  await closePool()
}
