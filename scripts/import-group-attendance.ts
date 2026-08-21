/**
 * scripts/import-group-attendance.ts
 *
 * Imports the "All Groups attendance" export into ops.ministry_events.
 *
 * This is the richest file in the folder: one row per gathering, with the
 * roster size and the attendance side by side. That pairing is what makes it
 * worth having — "24 members, 3 attended" is a fact no roster count can tell
 * you, and it is the difference between a ministry that exists on paper and one
 * people actually come to.
 *
 * Dry run unless --apply. Re-running is safe: the file hash blocks a duplicate
 * import, and events upsert on (ministry, date, name).
 *
 * Usage:
 *   pnpm import:attendance
 *   pnpm import:attendance --apply
 *   pnpm import:attendance --file="C:\\path\\to\\export.xlsx" --apply
 */

import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { basename, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const DEFAULT_FILE =
  'C:\\Users\\serve\\OneDrive\\HIF Data FIles\\2025-26 Raw Data\\2025-05-01-to-2026-04-21 - All Groups attendance.xlsx'

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

// ── parsing helpers ──────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)

/** Numbers arrive as numbers, numeric strings, or blanks. Blank is not zero. */
function num(v: unknown): number | null {
  if (v === null || v === undefined || String(v).trim() === '') return null
  const n = Number(String(v).replace(/[, ]/g, ''))
  return Number.isFinite(n) ? n : null
}

function text(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

/**
 * Dates come through as a Date (cellDates), an ISO-ish string, or d/m/Y. The
 * last is ambiguous with m/d/Y, so it is read as day-first: this is a Vietnamese
 * export and "3/4/2026" there means 3 April. Getting it backwards would silently
 * move a third of the events to the wrong month.
 */
function toDate(v: unknown): { date: string; at: Date } | null {
  if (v === null || v === undefined || String(v).trim() === '') return null
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return { date: v.toISOString().slice(0, 10), at: v }
  }
  const s = String(v).trim()
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/)
  if (dmy) {
    const [, d, m, y] = dmy
    const at = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
    if (!Number.isNaN(at.getTime())) return { date: at.toISOString().slice(0, 10), at }
  }
  const parsed = new Date(s)
  if (!Number.isNaN(parsed.getTime())) {
    return { date: parsed.toISOString().slice(0, 10), at: parsed }
  }
  return null
}

/** PCO group types onto the dashboard's vocabulary. */
function category(groupType: string | null): string | null {
  if (!groupType) return null
  const g = groupType.toLowerCase()
  if (g.includes('connect')) return 'connect_group'
  if (g.includes('fellowship')) return 'fellowship'
  if (g.includes('youth') || g.includes('aftershock')) return 'youth'
  if (g.includes('kid') || g.includes('quest')) return 'kids'
  if (g.includes('alpha') || g.includes('course') || g.includes('class')) return 'course'
  if (g.includes('service') || g.includes('sunday')) return 'service'
  return 'other'
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const doApply = args.includes('--apply')
  const fileArg = args.find((a) => a.startsWith('--file='))
  const file = fileArg ? fileArg.slice('--file='.length).replace(/^"|"$/g, '') : DEFAULT_FILE

  // SheetJS ESM does not bind fs, so read the bytes and hand them over.
  const mod = (await import('xlsx')) as unknown as Record<string, unknown>
  const XLSX = ((mod.default as typeof import('xlsx')) ?? mod) as typeof import('xlsx')

  const buf = readFileSync(file)
  const sha256 = createHash('sha256').update(buf).digest('hex')
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, raw: false })
  const sheetName = wb.SheetNames[0]!
  const sheet = wb.Sheets[sheetName]!
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null })

  console.log(`${basename(file)}`)
  console.log(`  sheet "${sheetName}" · ${records.length} rows · sha ${sha256.slice(0, 12)}…\n`)

  const { getPool } = await import('../src/lib/db')
  const pool = getPool()

  // ── refuse a file already imported ──
  const existing = await pool.query('select id, filename, imported_at from ops.file_imports where sha256 = $1', [sha256])
  if (existing.rows.length > 0) {
    const r = existing.rows[0]
    console.log(`Already imported as "${r.filename}" on ${new Date(r.imported_at).toISOString().slice(0, 10)}.`)
    console.log('Identical bytes, so there is nothing new to add. A genuinely updated')
    console.log('export would hash differently and import as a new snapshot.')
    process.exit(0)
  }

  // The export's own filename carries the window it covers; the end date is
  // what the snapshot represents.
  const range = basename(file).match(/(\d{4}-\d{2}-\d{2})[^\d]+(\d{4}-\d{2}-\d{2})/)
  const snapshotDate = range?.[2] ?? null

  // ── parse ──
  type Parsed = {
    groupName: string
    groupType: string | null
    eventName: string | null
    date: string
    starts: Date | null
    ends: Date | null
    location: string | null
    leaders: string | null
    membersCount: number | null
    total: number | null
    members: number | null
    visitors: number | null
    attendedNames: string | null
    absentNames: string | null
    notes: string | null
    url: string | null
  }

  const parsed: Parsed[] = []
  const skipped: Array<{ row: number; why: string }> = []

  records.forEach((r, i) => {
    const groupName = text(r['Group name'])
    if (!groupName) {
      skipped.push({ row: i + 2, why: 'no group name' })
      return
    }
    const start = toDate(r['Event start time'])
    if (!start) {
      skipped.push({ row: i + 2, why: `unparseable start time: ${JSON.stringify(r['Event start time'])}` })
      return
    }
    const end = toDate(r['Event end time'])

    parsed.push({
      groupName,
      groupType: text(r['Group type']),
      eventName: text(r['Event name']),
      date: start.date,
      starts: start.at,
      ends: end?.at ?? null,
      location: text(r['Location']),
      leaders: text(r['Leaders']),
      membersCount: num(r['Members count']),
      total: num(r['Total attended count']),
      members: num(r['Members attended count']),
      visitors: num(r['Visitors attended count']),
      attendedNames: text(r['Attended names']),
      absentNames: text(r['Absent names']),
      notes: text(r['Event notes']),
      url: text(r['Group attendance report url']),
    })
  })

  const byGroup = new Map<string, Parsed[]>()
  for (const p of parsed) byGroup.set(p.groupName, [...(byGroup.get(p.groupName) ?? []), p])

  const dates = parsed.map((p) => p.date).sort()
  console.log(`  ${parsed.length} events · ${byGroup.size} groups · ${dates[0]} → ${dates[dates.length - 1]}`)
  if (skipped.length) console.log(`  ${skipped.length} rows skipped`)
  console.log('')

  // Members and visitors are kept apart. Dividing TOTAL attendance by the
  // member roster produced rates above 100% for groups that regularly host
  // guests — which reads as a data error when it is actually the healthiest
  // signal in the file. Turnout is members-attended over roster; guests are
  // their own column.
  const mean = (xs: Array<number | null>) => {
    const present = xs.filter((x): x is number => x !== null)
    return present.length ? present.reduce((a, b) => a + b, 0) / present.length : null
  }
  const fmt = (n: number | null) => (n === null ? '—' : n.toFixed(1))

  console.log('  Group                                    Events  Roster  Members  Guests  Turnout')
  console.log('  ' + '─'.repeat(84))
  for (const [name, events] of [...byGroup].sort((a, b) => b[1].length - a[1].length)) {
    const roster = Math.max(0, ...events.map((e) => e.membersCount ?? 0))
    const avgMembers = mean(events.map((e) => e.members))
    const avgVisitors = mean(events.map((e) => e.visitors))
    const turnout =
      roster > 0 && avgMembers !== null ? `${Math.round((avgMembers / roster) * 100)}%` : '—'
    console.log(
      `  ${name.slice(0, 40).padEnd(40)} ${String(events.length).padStart(6)}  ${String(roster).padStart(6)}  ` +
        `${fmt(avgMembers).padStart(7)}  ${fmt(avgVisitors).padStart(6)}  ${turnout.padStart(7)}`,
    )
  }
  console.log('')
  console.log('  Turnout = average members attending / roster size. Guests are counted')
  console.log('  separately: a small group with steady guests is growing, not over-full.')
  console.log('')

  if (skipped.length) {
    console.log('  Skipped rows:')
    for (const s of skipped.slice(0, 10)) console.log(`    row ${s.row}: ${s.why}`)
    if (skipped.length > 10) console.log(`    …and ${skipped.length - 10} more`)
    console.log('')
  }

  if (!doApply) {
    console.log('DRY RUN — nothing written. Re-run with --apply.')
    await pool.end()
    process.exit(0)
  }

  // ── write ──
  const client = await pool.connect()
  try {
    await client.query('begin')

    const imp = await client.query(
      `insert into ops.file_imports (filename, sha256, kind, snapshot_date, sheet_count, row_count, imported_by)
       values ($1,$2,'group_attendance',$3,$4,$5,$6) returning id`,
      [basename(file), sha256, snapshotDate, wb.SheetNames.length, parsed.length, 'import-group-attendance'],
    )
    const importId = imp.rows[0].id as number

    // Ministries are created from what the export contains. A human can merge
    // duplicates afterwards via ops.ministry_aliases; inventing the canonical
    // list up front would just be guessing at spellings.
    const ministryId = new Map<string, number>()
    for (const [name, events] of byGroup) {
      const slug = slugify(name)
      const cat = category(events[0]!.groupType)
      const found = await client.query(
        `select m.id from ops.ministries m
          where m.slug = $1
             or exists (select 1 from ops.ministry_aliases a
                         where a.ministry_id = m.id and a.alias = $2)
          limit 1`,
        [slug, name],
      )
      if (found.rows.length > 0) {
        ministryId.set(name, found.rows[0].id)
        continue
      }
      const created = await client.query(
        `insert into ops.ministries (slug, name, category, note)
         values ($1,$2,$3,$4) returning id`,
        [slug, name, cat, `Created from ${basename(file)}`],
      )
      ministryId.set(name, created.rows[0].id)
      await client.query(
        `insert into ops.ministry_aliases (alias, ministry_id, source)
         values ($1,$2,$3) on conflict (alias) do nothing`,
        [name, created.rows[0].id, basename(file)],
      )
    }

    let inserted = 0
    let updated = 0
    for (const p of parsed) {
      const res = await client.query(
        `insert into ops.ministry_events
           (ministry_id, event_date, event_name, location, starts_at, ends_at,
            total_attended, members_attended, visitors_attended, members_count,
            leaders, attended_names, absent_names, notes, source_import_id, external_ref)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         on conflict (ministry_id, event_date, event_name) do update set
           total_attended    = excluded.total_attended,
           members_attended  = excluded.members_attended,
           visitors_attended = excluded.visitors_attended,
           members_count     = excluded.members_count,
           attended_names    = excluded.attended_names,
           absent_names      = excluded.absent_names,
           source_import_id  = excluded.source_import_id
         returning (xmax = 0) as was_insert`,
        [
          ministryId.get(p.groupName), p.date, p.eventName, p.location, p.starts, p.ends,
          p.total, p.members, p.visitors, p.membersCount,
          p.leaders, p.attendedNames, p.absentNames, p.notes, importId, p.url,
        ],
      )
      res.rows[0].was_insert ? inserted++ : updated++
    }

    await client.query('commit')
    console.log(`✓ import #${importId} · ${inserted} events created, ${updated} updated`)
    console.log(`  ${ministryId.size} ministries resolved or created`)
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
