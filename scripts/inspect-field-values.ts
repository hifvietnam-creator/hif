/**
 * scripts/inspect-field-values.ts
 *
 * Shows AGGREGATE value distributions for categorical custom fields, so we
 * know what is actually in them before designing anything around them.
 *
 * Aggregates only — value plus a count. No names, no person IDs, no linkage
 * between a person and a value. Free-text fields are summarised by length and
 * fill rate rather than content.
 *
 * Usage:
 *   pnpm inspect:values
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

const { getPool, closePool } = await import('../src/lib/db')
const db = getPool()

// Categorical fields — safe and useful to see the distinct values of.
const CATEGORICAL = [
  'Newcomer_Engagement_Record',
  'Baptized',
  'Baptism Type',
  'Nationality',
  'Country of Residence',
  'District in Hanoi',
  'Denomination',
  'Volunteer in Ministry (1st)',
  'Role in Ministry (1st)',
  'Domain of Work',
]

// Free text — summarise shape only, never content.
const FREE_TEXT = ['Groups', 'Volunteer in 4th, 5th ministries? (please enter)']

try {
  for (const field of CATEGORICAL) {
    const { rows } = await db.query<{ value: string; n: string }>(
      `select fd.value, count(*)::text as n
         from pco.field_data fd
         join pco.field_definitions d on d.id = fd.field_definition_id
        where d.name = $1 and nullif(trim(fd.value), '') is not null
        group by fd.value
        order by count(*) desc
        limit 30`,
      [field],
    )
    if (rows.length === 0) continue

    const total = rows.reduce((s, r) => s + parseInt(r.n, 10), 0)
    console.log(`\n\x1b[1m${field}\x1b[0m  \x1b[2m(${total} values)\x1b[0m`)
    for (const r of rows) {
      const n = parseInt(r.n, 10)
      const bar = '█'.repeat(Math.max(1, Math.round((n / total) * 30)))
      console.log(
        `  ${r.value.slice(0, 44).padEnd(45)} ${String(n).padStart(5)}  \x1b[2m${bar}\x1b[0m`,
      )
    }
    if (rows.length === 30) console.log('  \x1b[2m… truncated at 30 distinct values\x1b[0m')
  }

  for (const field of FREE_TEXT) {
    const { rows } = await db.query<{ n: string; distinct: string; avg_len: string }>(
      `select count(*)::text as n,
              count(distinct fd.value)::text as distinct,
              round(avg(length(fd.value)))::text as avg_len
         from pco.field_data fd
         join pco.field_definitions d on d.id = fd.field_definition_id
        where d.name = $1 and nullif(trim(fd.value), '') is not null`,
      [field],
    )
    const r = rows[0]
    if (!r || r.n === '0') continue
    console.log(`\n\x1b[1m${field}\x1b[0m \x1b[2m(free text)\x1b[0m`)
    console.log(`  ${r.n} values, ${r.distinct} distinct, avg ${r.avg_len} chars`)
  }

  // ── Date Joined, parsed properly this time ─────────────────────────────────
  // Stored as DD/MM/YYYY text. min()/max() on text sorts by day, which is
  // meaningless — parse to a real date first.

  console.log('\n\x1b[1mDate Joined/started attending HIF\x1b[0m')

  const { rows: dateRows } = await db.query<{
    parsed: string
    total: string
    unparsed: string
  }>(
    `with vals as (
       select fd.value,
              case when fd.value ~ '^\\d{2}/\\d{2}/\\d{4}$'
                   then to_date(fd.value, 'DD/MM/YYYY')
                   else null end as d
         from pco.field_data fd
         join pco.field_definitions d2 on d2.id = fd.field_definition_id
        where d2.name = 'Date Joined/started attending HIF'
          and nullif(trim(fd.value), '') is not null
     )
     select count(*) filter (where d is not null)::text as parsed,
            count(*)::text as total,
            count(*) filter (where d is null)::text as unparsed
       from vals`,
  )
  const dr = dateRows[0]
  if (dr && dr.total !== '0') {
    console.log(`  ${dr.total} values, ${dr.parsed} parsed as DD/MM/YYYY, ${dr.unparsed} unparsed`)

    const { rows: byYear } = await db.query<{ yr: string; n: string }>(
      `select extract(year from to_date(fd.value,'DD/MM/YYYY'))::int::text as yr,
              count(*)::text as n
         from pco.field_data fd
         join pco.field_definitions d2 on d2.id = fd.field_definition_id
        where d2.name = 'Date Joined/started attending HIF'
          and fd.value ~ '^\\d{2}/\\d{2}/\\d{4}$'
        group by 1 order by 1`,
    )
    console.log('\n  By year:')
    for (const r of byYear) {
      const n = parseInt(r.n, 10)
      console.log(`    ${r.yr}  ${String(n).padStart(4)}  \x1b[2m${'█'.repeat(Math.min(40, n))}\x1b[0m`)
    }
    console.log(
      '\n  \x1b[2mIf this stops years ago, the field was abandoned and cannot\n' +
        '  serve as a current journey signal.\x1b[0m',
    )
  }

  console.log()
} catch (err) {
  console.error(`\n\x1b[31m✗ ${err instanceof Error ? err.message : String(err)}\x1b[0m\n`)
  process.exitCode = 1
} finally {
  await closePool()
}
