/**
 * scripts/db-migrate.ts
 *
 * Runs the analytics SQL migrations in migrations/analytics/ against the Neon
 * database. Separate from Payload's own migrations, which manage `public`.
 *
 * Each file runs once, inside a transaction, and is recorded in
 * hif.schema_migrations. Re-running is safe: applied files are skipped.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/db-migrate.ts
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/db-migrate.ts --status
 *
 * Requires: pnpm add pg && pnpm add -D @types/pg
 */

import { readFileSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const MIGRATIONS_DIR = resolve(ROOT, 'migrations', 'analytics')

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

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL is not set.')
  process.exit(1)
}

const statusOnly = process.argv.includes('--status')

const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const skip = (m: string) => console.log(`  \x1b[2m·\x1b[0m \x1b[2m${m}\x1b[0m`)
const fail = (m: string) => console.log(`  \x1b[31m✗\x1b[0m ${m}`)

const pool = new pg.Pool({
  connectionString,
  // Neon requires TLS. node-postgres won't infer it from the URL alone.
  ssl: /neon\.tech|sslmode=require/.test(connectionString)
    ? { rejectUnauthorized: false }
    : undefined,
})

const client = await pool.connect()

try {
  // Bootstrap: the tracking table lives in hif, so that schema must exist
  // before the first migration runs.
  await client.query('create schema if not exists hif')
  await client.query(`
    create table if not exists hif.schema_migrations (
      filename    text primary key,
      checksum    text not null,
      applied_at  timestamptz not null default now()
    )
  `)

  const applied = new Map<string, string>()
  const { rows } = await client.query<{ filename: string; checksum: string }>(
    'select filename, checksum from hif.schema_migrations',
  )
  for (const r of rows) applied.set(r.filename, r.checksum)

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  console.log(`\n\x1b[1mAnalytics migrations\x1b[0m  (${files.length} files)\n`)

  let ran = 0

  for (const file of files) {
    const sql = readFileSync(resolve(MIGRATIONS_DIR, file), 'utf8')
    const checksum = createHash('sha256').update(sql).digest('hex').slice(0, 12)
    const previous = applied.get(file)

    if (previous) {
      if (previous !== checksum) {
        // The file changed after being applied. Editing an applied migration
        // means the database and the repo have silently diverged.
        fail(`${file} — ALREADY APPLIED BUT CHANGED (was ${previous}, now ${checksum})`)
        console.log('      Create a new migration instead of editing an applied one.')
      } else {
        skip(`${file} — already applied`)
      }
      continue
    }

    if (statusOnly) {
      console.log(`  \x1b[33m→\x1b[0m ${file} — pending`)
      continue
    }

    try {
      await client.query('begin')
      await client.query(sql)
      await client.query(
        'insert into hif.schema_migrations (filename, checksum) values ($1, $2)',
        [file, checksum],
      )
      await client.query('commit')
      ok(`${file}`)
      ran++
    } catch (err) {
      await client.query('rollback')
      fail(`${file}`)
      console.error(`\n${err instanceof Error ? err.message : String(err)}\n`)
      process.exitCode = 1
      break
    }
  }

  if (!statusOnly && process.exitCode !== 1) {
    console.log(`\n  ${ran} migration(s) applied.\n`)

    // Show what now exists, so the result is verifiable rather than assumed.
    const { rows: tables } = await client.query<{ table_schema: string; table_name: string }>(`
      select table_schema, table_name
      from information_schema.tables
      where table_schema in ('pco','ml','hif')
      order by table_schema, table_name
    `)
    let currentSchema = ''
    for (const t of tables) {
      if (t.table_schema !== currentSchema) {
        currentSchema = t.table_schema
        console.log(`  \x1b[1m${currentSchema}\x1b[0m`)
      }
      console.log(`    ${t.table_name}`)
    }
    console.log()
  }
} finally {
  client.release()
  await pool.end()
}
