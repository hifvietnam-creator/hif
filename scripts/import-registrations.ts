/**
 * scripts/import-registrations.ts
 *
 * Imports event registration exports into ops.registrations, driven by
 * config/registration-sources.json.
 *
 * These are the TRY-stage records: Alpha, Pickleball, Paskong Pinoy, Family
 * Day. Most of these people have no Planning Center record and never will —
 * they came to one thing. That is exactly why the files matter, and why the
 * dashboard cannot see first contact without them.
 *
 * Deliberately does NOT deduplicate people. The same person registering for
 * Alpha twice is a real fact about that person, not a mess to tidy. Dedup is a
 * reporting decision, made when reading, not when writing.
 *
 * Usage:
 *   pnpm import:registrations
 *   pnpm import:registrations --apply
 *   pnpm import:registrations --apply --only="Alpha Fall 2025"
 */

import { createHash } from 'crypto'
import { readFileSync, readdirSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const DEFAULT_DIR = 'C:\\Users\\serve\\OneDrive\\HIF Data FIles\\2025-26 Raw Data'

function loadEnv() {
  try {
    const envFile = readFileSync(resolve(ROOT, '.env'), 'utf8')
    for (const line of envFile.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const k = t.slice(0, eq).trim()
      const v = t.slice(eq + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  } catch {
    /* optional */
  }
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

function text(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' || s === '-' ? null : s
}

/** Emails arrive with stray spaces, capitals, and occasionally two in one cell. */
function email(v: unknown): string | null {
  const s = text(v)
  if (!s) return null
  const first = s.split(/[,;\s]+/).find((p) => p.includes('@'))
  return first ? first.toLowerCase() : null
}

function toTimestamp(v: unknown): Date | null {
  if (v === null || v === undefined || String(v).trim() === '') return null
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

interface Source {
  file: string
  sheet: string
  eventLabel: string
  ministry?: string
  registeredAtColumn?: string
  /** A column name, or several tried in order — forms often have "Email",
   *  "Email Address" and "Email Address 2" from successive edits, with the
   *  data in whichever one was live at the time. */
  map?: Record<string, string | string[]>
  ignore?: string[]
  note?: string
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * These filenames contain double spaces, trailing spaces and inconsistent
 * hyphenation, and are edited by hand. Matching on the exact string means a
 * config entry silently stops working when someone renames a file slightly, so
 * the directory is searched with whitespace and case normalised.
 */
function resolveFile(dir: string, wanted: string, listing: string[]): string | null {
  if (listing.includes(wanted)) return join(dir, wanted)
  const target = norm(wanted)
  const hit = listing.find((f) => norm(f) === target)
  if (hit) return join(dir, hit)
  // Last resort: ignore punctuation too, so "Fall-" and "Fall -" both match.
  const loose = (s: string) => norm(s).replace(/[^a-z0-9]/g, '')
  const fuzzy = listing.find((f) => loose(f) === loose(wanted))
  return fuzzy ? join(dir, fuzzy) : null
}

/** First column with an actual value wins. */
function pick(row: Record<string, unknown>, spec: string | string[] | undefined): unknown {
  if (!spec) return null
  const keys = Array.isArray(spec) ? spec : [spec]
  for (const k of keys) {
    const v = row[k]
    if (v !== null && v !== undefined && String(v).trim() !== '') return v
  }
  return null
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const doApply = args.includes('--apply')
  const onlyArg = args.find((a) => a.startsWith('--only='))
  const only = onlyArg ? onlyArg.slice('--only='.length).replace(/^"|"$/g, '') : null
  const dirArg = args.find((a) => a.startsWith('--dir='))
  const dir = dirArg ? dirArg.slice('--dir='.length).replace(/^"|"$/g, '') : DEFAULT_DIR

  const cfg = JSON.parse(
    readFileSync(resolve(ROOT, 'config/registration-sources.json'), 'utf8'),
  ) as { sources: Source[] }

  const sources = only ? cfg.sources.filter((s) => s.eventLabel === only) : cfg.sources
  if (sources.length === 0) {
    console.error(`No source matches "${only}".`)
    process.exit(1)
  }

  const mod = (await import('xlsx')) as unknown as Record<string, unknown>
  const XLSX = ((mod.default as typeof import('xlsx')) ?? mod) as typeof import('xlsx')

  type Row = {
    source: Source
    fullName: string | null
    firstName: string | null
    lastName: string | null
    email: string | null
    phone: string | null
    nationality: string | null
    registeredAt: Date | null
    answers: Record<string, unknown>
  }

  const parsed: Row[] = []
  const fileHashes = new Map<string, string>()
  const summary: Array<{ label: string; rows: number; withEmail: number; withPhone: number; named: number }> = []

  const listing = readdirSync(dir)

  for (const src of sources) {
    const full = resolveFile(dir, src.file, listing)
    if (!full) {
      console.log(`  ! no file matching "${src.file}"`)
      continue
    }
    let buf: Buffer
    try {
      buf = readFileSync(full)
    } catch (err) {
      console.log(`  ! could not read ${src.file}: ${(err as Error).message}`)
      continue
    }
    if (!fileHashes.has(src.file)) {
      fileHashes.set(src.file, createHash('sha256').update(buf).digest('hex'))
    }

    const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, raw: false })
    const sheet = wb.Sheets[src.sheet]
    if (!sheet) {
      console.log(`  ! ${src.file}: no sheet "${src.sheet}" (has: ${wb.SheetNames.join(', ')})`)
      continue
    }

    const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })
    const map = src.map ?? {}
    const mapped = new Set(Object.values(map).flatMap((v) => (Array.isArray(v) ? v : [v])))
    const ignored = new Set(src.ignore ?? [])
    if (src.registeredAtColumn) mapped.add(src.registeredAtColumn)

    let kept = 0
    for (const r of records) {
      const fullName = text(pick(r, map.full_name))
      const firstName = text(pick(r, map.first_name))
      const lastName = text(pick(r, map.last_name))

      // A row with no name at all is spreadsheet padding, not a person.
      if (!fullName && !firstName && !lastName) continue

      // Everything not explicitly mapped or ignored is preserved. These forms
      // ask questions nobody will anticipate, and discarding them at import is
      // irreversible.
      const answers: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(r)) {
        if (mapped.has(k) || ignored.has(k)) continue
        if (v === null || String(v).trim() === '') continue
        if (/^\(col \d+\)$|^Column \d+$|^__EMPTY/.test(k)) continue
        answers[k] = v instanceof Date ? v.toISOString() : v
      }

      parsed.push({
        source: src,
        fullName,
        firstName,
        lastName,
        email: email(pick(r, map.email)),
        phone: text(pick(r, map.phone)),
        nationality: text(pick(r, map.nationality)),
        registeredAt: src.registeredAtColumn ? toTimestamp(r[src.registeredAtColumn]) : null,
        answers,
      })
      kept++
    }

    const mine = parsed.filter((p) => p.source.eventLabel === src.eventLabel)
    summary.push({
      label: src.eventLabel,
      rows: kept,
      withEmail: mine.filter((p) => p.email).length,
      withPhone: mine.filter((p) => p.phone).length,
      named: mine.filter((p) => p.fullName || p.firstName).length,
    })
  }

  console.log('\n  Event                        People  Email  Phone  Matchable')
  console.log('  ' + '─'.repeat(66))
  for (const s of summary) {
    const pct = s.rows ? Math.round((s.withEmail / s.rows) * 100) : 0
    console.log(
      `  ${s.label.padEnd(28)} ${String(s.rows).padStart(6)} ${String(s.withEmail).padStart(6)} ` +
        `${String(s.withPhone).padStart(6)}  ${String(pct).padStart(8)}%`,
    )
  }
  console.log('')
  console.log(`  ${parsed.length} registrations across ${summary.length} events`)
  console.log('  Matchable = has an email, the only reliable key to a Planning Center record.')
  console.log('')

  const noEmail = summary.filter((s) => s.withEmail === 0)
  if (noEmail.length > 0) {
    console.log(`  ! ${noEmail.map((s) => s.label).join(', ')} — no email column at all.`)
    console.log('    These people cannot be linked to church records by any reliable means.')
    console.log('')
  }

  if (!doApply) {
    console.log('DRY RUN — nothing written. Re-run with --apply.')
    process.exit(0)
  }

  const { getPool } = await import('../src/lib/db')
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('begin')

    const importIds = new Map<string, number>()
    for (const [filename, sha] of fileHashes) {
      const existing = await client.query('select id from ops.file_imports where sha256 = $1', [sha])
      if (existing.rows.length > 0) {
        importIds.set(filename, existing.rows[0].id)
        continue
      }
      const rowsForFile = parsed.filter((p) => p.source.file === filename).length
      const imp = await client.query(
        `insert into ops.file_imports (filename, sha256, kind, row_count, imported_by)
         values ($1,$2,'registration',$3,$4) returning id`,
        [filename, sha, rowsForFile, 'import-registrations'],
      )
      importIds.set(filename, imp.rows[0].id)
    }

    // Ministries referenced by the config, created if absent.
    const ministryIds = new Map<string, number>()
    for (const src of sources) {
      if (!src.ministry || ministryIds.has(src.ministry)) continue
      const slug = slugify(src.ministry)
      const found = await client.query(
        `select m.id from ops.ministries m
          where m.slug = $1
             or exists (select 1 from ops.ministry_aliases a where a.ministry_id = m.id and a.alias = $2)
          limit 1`,
        [slug, src.ministry],
      )
      if (found.rows.length > 0) {
        ministryIds.set(src.ministry, found.rows[0].id)
        continue
      }
      const created = await client.query(
        `insert into ops.ministries (slug, name, category, note)
         values ($1,$2,$3,'Created from registration import') returning id`,
        [slug, src.ministry, 'outreach'],
      )
      ministryIds.set(src.ministry, created.rows[0].id)
    }

    // Registrations for these events are replaced wholesale rather than merged.
    // A re-export is the corrected version of the same list; merging would
    // leave deleted rows behind forever.
    const labels = [...new Set(sources.map((s) => s.eventLabel))]
    const removed = await client.query(
      `delete from ops.registrations where event_label = any($1::text[])`,
      [labels],
    )
    if (removed.rowCount) console.log(`  replaced ${removed.rowCount} existing rows for these events`)

    let written = 0
    for (const p of parsed) {
      await client.query(
        `insert into ops.registrations
           (ministry_id, event_label, registered_at, full_name, first_name, last_name,
            email, phone, nationality, answers, source_import_id)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          p.source.ministry ? ministryIds.get(p.source.ministry) : null,
          p.source.eventLabel,
          p.registeredAt,
          p.fullName,
          p.firstName,
          p.lastName,
          p.email,
          p.phone,
          p.nationality,
          JSON.stringify(p.answers),
          importIds.get(p.source.file) ?? null,
        ],
      )
      written++
    }

    // Link to Planning Center where an email matches exactly. No fuzzy name
    // matching: a wrong link silently corrupts every downstream number,
    // whereas a missing one is just a gap.
    const linked = await client.query(`
      update ops.registrations r
         set pco_person_id = e.person_id,
             matched_at = now()
        from pco.emails e
       where r.email is not null
         and r.pco_person_id is null
         and lower(e.address) = lower(r.email::text)
    `)

    await client.query('commit')
    console.log(`\n✓ ${written} registrations written`)
    console.log(`  ${linked.rowCount ?? 0} matched to a Planning Center person by email`)
    console.log(`  ${written - (linked.rowCount ?? 0)} have no church record — the finding, not the failure`)
  } catch (err) {
    await client.query('rollback')
    console.error('Rolled back:', (err as Error).message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }

  process.exit(process.exitCode ?? 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
