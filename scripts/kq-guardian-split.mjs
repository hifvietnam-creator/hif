/**
 * scripts/kq-guardian-split.mjs
 *
 * Read-only. Answers the question in docs/kq-handoff.md before the guardian
 * entry screen is built: of the children nobody may collect, how many have a
 * guardian on record with none ticked, and how many have no guardian at all.
 *
 * Usage:  node scripts/kq-guardian-split.mjs
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const line of readFileSync(resolve(ROOT, '.env'), 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  const key = t.slice(0, eq).trim()
  if (!process.env[key]) process.env[key] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
}

const url = process.env.DATABASE_URL
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1) }

const client = new pg.Client({
  connectionString: url,
  ssl: /neon\.tech|sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
})

const queries = [
  ['The split (the query from the handoff, unchanged)', `
    select
      case when exists (select 1 from kq.child_guardians cg where cg.child_id = r.child_id)
           then 'has a guardian, none ticked'
           else 'no guardian on record' end as situation,
      count(*)::int as children
    from kq.current_roster r
    where not exists (
      select 1 from kq.child_guardians cg
       where cg.child_id = r.child_id and cg.can_pickup
    )
    group by 1`],
  ['Roster size, for scale', `
    select count(*)::int as on_roster from kq.current_roster`],
  ['Where a guardian exists but none is ticked: what relationship is recorded', `
    select coalesce(nullif(trim(lower(cg.relationship)), ''), '(blank)') as relationship,
           count(*)::int as guardians,
           count(distinct cg.child_id)::int as children
      from kq.current_roster r
      join kq.child_guardians cg on cg.child_id = r.child_id
     where not exists (
       select 1 from kq.child_guardians x
        where x.child_id = r.child_id and x.can_pickup
     )
     group by 1 order by 2 desc`],
  ['The same children by room', `
    select r.group_code,
           count(*) filter (where exists (
             select 1 from kq.child_guardians cg where cg.child_id = r.child_id))::int as none_ticked,
           count(*) filter (where not exists (
             select 1 from kq.child_guardians cg where cg.child_id = r.child_id))::int as no_guardian
      from kq.current_roster r
     where not exists (
       select 1 from kq.child_guardians cg
        where cg.child_id = r.child_id and cg.can_pickup
     )
     group by 1 order by 1`],
]

await client.connect()
try {
  await client.query('begin read only')
  for (const [title, sql] of queries) {
    const { rows } = await client.query(sql)
    console.log(`\n${title}`)
    if (rows.length === 0) console.log('  (no rows)')
    else console.table(rows)
  }
  await client.query('rollback')
} finally {
  await client.end()
}
