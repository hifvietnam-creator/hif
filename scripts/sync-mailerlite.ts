/**
 * scripts/sync-mailerlite.ts
 *
 * Mirrors MailerLite into the `ml` schema and builds the PCO ↔ MailerLite
 * bridge in hif.email_links.
 *
 * Usage:
 *   pnpm sync:mailerlite
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

const { syncMailerLiteAll } = await import('../src/lib/sync/mailerlite')
const { getPool, closePool } = await import('../src/lib/db')

console.log('\n\x1b[1mMailerLite sync\x1b[0m\n')
const started = Date.now()

try {
  const r = await syncMailerLiteAll()

  console.log(`\n  \x1b[32m✓\x1b[0m subscribers        ${r.subscribers!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m groups             ${r.groups!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m group memberships  ${r.groupSubscribers!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m campaigns          ${r.campaigns!.recordsSeen}`)
  console.log(`  \x1b[32m✓\x1b[0m email links        ${r.links!.recordsSeen}`)

  const db = getPool()
  const scalar = async (sql: string) => {
    const { rows } = await db.query<{ n: string }>(sql)
    return parseInt(rows[0]?.n ?? '0', 10)
  }
  const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(0) + '%' : '—')

  // ── Linking outcome ────────────────────────────────────────────────────────

  const subs = await scalar('select count(*)::text n from ml.subscribers')
  const linkedSubs = await scalar(
    'select count(distinct mailerlite_subscriber_id)::text n from hif.email_links',
  )
  const linkedPeople = await scalar(
    'select count(distinct pco_person_id)::text n from hif.email_links',
  )
  const ambiguous = await scalar(
    'select count(*)::text n from hif.email_links where is_ambiguous',
  )
  const unmatched = await scalar('select count(*)::text n from hif.unmatched_subscribers')

  console.log('\n\x1b[1mLinking\x1b[0m\n')
  console.log(`  subscribers matched to a person   ${String(linkedSubs).padStart(6)}  ${pct(linkedSubs, subs)}`)
  console.log(`  distinct PCO people matched       ${String(linkedPeople).padStart(6)}`)
  console.log(`  ambiguous (shared inbox)          ${String(ambiguous).padStart(6)}  \x1b[2m← household, not a person\x1b[0m`)
  console.log(`  subscribers with no PCO record    ${String(unmatched).padStart(6)}  ${pct(unmatched, subs)}`)

  const engagedStrangers = await scalar(
    `select count(*)::text n from hif.unmatched_subscribers
      where status = 'active' and coalesce(clicks_count,0) > 0`,
  )
  console.log(
    `\n  \x1b[1m${engagedStrangers}\x1b[0m of those actively CLICK your email but have no church record.`,
  )
  console.log('  \x1b[2mClicks, not opens — Apple Mail Privacy Protection inflates opens.\x1b[0m')

  // ── Reachability by membership status ──────────────────────────────────────
  // The question this whole integration exists to answer.

  const { rows: reach } = await db.query<{
    membership: string
    total: string
    active: string
    unsub: string
    bounced: string
    none: string
  }>(`
    with best as (
      select l.pco_person_id as person_id,
             min(case s.status
                   when 'active' then 1 when 'unconfirmed' then 2
                   when 'unsubscribed' then 3 when 'junk' then 4
                   when 'bounced' then 5 else 6 end) as rank
        from hif.email_links l
        join ml.subscribers s on s.id = l.mailerlite_subscriber_id
       group by l.pco_person_id
    )
    select coalesce(p.membership,'(none)') as membership,
           count(*)::text as total,
           count(*) filter (where b.rank in (1,2))::text as active,
           count(*) filter (where b.rank = 3)::text as unsub,
           count(*) filter (where b.rank = 5)::text as bounced,
           count(*) filter (where b.rank is null)::text as none
      from pco.people p
      left join best b on b.person_id = p.id
     group by 1
     order by count(*) desc
     limit 14
  `)

  console.log('\n\x1b[1mReachability by membership status\x1b[0m\n')
  console.log(
    '  ' + 'status'.padEnd(22) + 'people'.padStart(7) + 'reachable'.padStart(11) +
      'unsub'.padStart(7) + 'bounced'.padStart(9) + 'not on list'.padStart(13) + '   %',
  )
  console.log('  ' + '─'.repeat(72))
  for (const r2 of reach) {
    const total = parseInt(r2.total, 10)
    const active = parseInt(r2.active, 10)
    console.log(
      '  ' + r2.membership.slice(0, 21).padEnd(22) +
        r2.total.padStart(7) + r2.active.padStart(11) + r2.unsub.padStart(7) +
        r2.bounced.padStart(9) + r2.none.padStart(13) + pct(active, total).padStart(6),
    )
  }

  console.log(
    '\n  \x1b[2mbounced = a fixable data bug. unsubscribed = a choice to respect.\n' +
      '  Neither changes whether someone belongs — that comes from PCO alone.\x1b[0m',
  )

  console.log(`\n  Done in ${((Date.now() - started) / 1000).toFixed(1)}s\n`)
} catch (err) {
  console.error(`\n\x1b[31m✗ ${err instanceof Error ? err.message : String(err)}\x1b[0m\n`)
  process.exitCode = 1
} finally {
  await closePool()
}
