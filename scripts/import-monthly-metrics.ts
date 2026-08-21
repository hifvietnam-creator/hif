/**
 * scripts/import-monthly-metrics.ts
 *
 * Imports "HIF Monthly Metrics_with Dashboard.xlsx" → ops.metric_definitions
 * and ops.monthly_metrics.
 *
 * This is the report the dashboard replaces, so it is also the yardstick: if
 * our computed figures disagree with these, ours are wrong until shown
 * otherwise. Importing them means the comparison can be made continuously
 * rather than by eye.
 *
 * The sheet is transposed — metrics run across the columns, months down the
 * rows — and its first data row names who owns each metric rather than holding
 * any data.
 *
 * Usage:
 *   pnpm import:metrics
 *   pnpm import:metrics --apply
 */

import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import { basename, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const DEFAULT_FILE =
  'C:\\Users\\serve\\OneDrive\\HIF Data FIles\\2025-26 Raw Data\\2026-04-03 HIF Monthly Metrics_with Dashboard.xlsx'

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
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60)

/**
 * The four states a cell can be in. Keeping them apart is the entire point:
 * charting "unknown" as zero would draw a collapse that never happened.
 */
function readCell(raw: unknown): { value: number | null; status: string } {
  if (raw === null || raw === undefined) return { value: null, status: 'missing' }
  const s = String(raw).trim()
  if (s === '') return { value: null, status: 'missing' }
  if (s === '?' || /^n\/?a$/i.test(s) || /unknown/i.test(s)) return { value: null, status: 'unknown' }
  if (s === '-' || s === '–' || s === '—') return { value: null, status: 'not_applicable' }
  const n = Number(s.replace(/[, ]/g, ''))
  if (!Number.isFinite(n)) return { value: null, status: 'unknown' }
  return { value: n, status: n === 0 ? 'zero' : 'reported' }
}

/** Month-end labels like "Tue Sep 30 2025 23:59:56 GMT+0700" → 2025-09-01. */
function toMonth(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return `${raw.getUTCFullYear()}-${String(raw.getUTCMonth() + 1).padStart(2, '0')}-01`
  }
  const s = String(raw).trim()
  if (!s) return null
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`
  }
  return null
}

/** Which of these could ever be automated, and which need a human. */
function sourceKind(label: string): string {
  const l = label.toLowerCase()
  if (/membership request|baptism|foundations/.test(l)) return 'pco'
  if (/connect group|fellowship|alpha/.test(l)) return 'pco'
  if (/first time guest|new resident/.test(l)) return 'pco'
  return 'headcount'
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const doApply = args.includes('--apply')
  const fileArg = args.find((a) => a.startsWith('--file='))
  const file = fileArg ? fileArg.slice('--file='.length).replace(/^"|"$/g, '') : DEFAULT_FILE

  const mod = (await import('xlsx')) as unknown as Record<string, unknown>
  const XLSX = ((mod.default as typeof import('xlsx')) ?? mod) as typeof import('xlsx')

  const buf = readFileSync(file)
  const sha256 = createHash('sha256').update(buf).digest('hex')
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, raw: false })

  const sheet = wb.Sheets['Monthly']
  if (!sheet) {
    console.error(`No "Monthly" sheet. Found: ${wb.SheetNames.join(', ')}`)
    process.exit(1)
  }

  const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: null })

  // Header is row 2 (index 1); row 3 is Oversight; months follow.
  const header = (grid[1] ?? []).map((h) => (h === null ? '' : String(h).trim()))
  const oversight = grid[2] ?? []
  const monthRows = grid.slice(3)

  const metrics = header
    .map((label, i) => ({ label, col: i, owner: oversight[i] ? String(oversight[i]).trim() : null }))
    .filter((m) => m.col > 0 && m.label !== '')

  console.log(`${basename(file)}`)
  console.log(`  ${metrics.length} metrics · ${monthRows.length} month rows · sha ${sha256.slice(0, 12)}…\n`)

  type Cell = { metric: string; label: string; owner: string | null; month: string; value: number | null; status: string }
  const cells: Cell[] = []
  const months: string[] = []

  for (const row of monthRows) {
    const month = toMonth((row as unknown[])[0])
    if (!month) continue
    months.push(month)
    for (const m of metrics) {
      const { value, status } = readCell((row as unknown[])[m.col])
      cells.push({ metric: slugify(m.label), label: m.label, owner: m.owner, month, value, status })
    }
  }

  const byStatus = new Map<string, number>()
  for (const c of cells) byStatus.set(c.status, (byStatus.get(c.status) ?? 0) + 1)

  console.log(`  Months: ${months.join(', ')}\n`)
  console.log('  Cell states')
  for (const [s, n] of [...byStatus].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${s.padEnd(16)} ${String(n).padStart(4)}`)
  }
  console.log('')

  console.log('  Metric                                          Owner        Reported  Latest')
  console.log('  ' + '─'.repeat(84))
  for (const m of metrics) {
    const key = slugify(m.label)
    const mine = cells.filter((c) => c.metric === key)
    const reported = mine.filter((c) => c.status === 'reported' || c.status === 'zero').length
    const latest = [...mine].reverse().find((c) => c.value !== null)
    console.log(
      `  ${m.label.slice(0, 46).padEnd(46)} ${(m.owner ?? '—').slice(0, 11).padEnd(11)} ` +
        `${String(reported).padStart(8)}  ${latest?.value ?? '—'}`,
    )
  }
  console.log('')

  if (!doApply) {
    console.log('DRY RUN — nothing written. Re-run with --apply.')
    process.exit(0)
  }

  const { getPool } = await import('../src/lib/db')
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('begin')

    const dup = await client.query('select id from ops.file_imports where sha256 = $1', [sha256])
    let importId: number
    if (dup.rows.length > 0) {
      importId = dup.rows[0].id
      console.log(`  (file already recorded as import #${importId}; refreshing values)`)
    } else {
      const imp = await client.query(
        `insert into ops.file_imports (filename, sha256, kind, snapshot_date, sheet_count, row_count, imported_by)
         values ($1,$2,'monthly_metrics',$3,$4,$5,$6) returning id`,
        [basename(file), sha256, months[months.length - 1] ?? null, wb.SheetNames.length, cells.length, 'import-monthly-metrics'],
      )
      importId = imp.rows[0].id
    }

    for (const m of metrics) {
      await client.query(
        `insert into ops.metric_definitions (metric_key, label, owner, source_kind, sort_order)
         values ($1,$2,$3,$4,$5)
         on conflict (metric_key) do update set
           label = excluded.label,
           owner = coalesce(excluded.owner, ops.metric_definitions.owner),
           sort_order = excluded.sort_order`,
        [slugify(m.label), m.label, m.owner, sourceKind(m.label), m.col],
      )
    }

    let written = 0
    for (const c of cells) {
      await client.query(
        `insert into ops.monthly_metrics
           (metric_key, metric_label, period_month, value, value_status, origin, source_import_id)
         values ($1,$2,$3,$4,$5,'spreadsheet',$6)
         on conflict (metric_key, period_month) do update set
           value = excluded.value,
           value_status = excluded.value_status,
           source_import_id = excluded.source_import_id`,
        [c.metric, c.label, c.month, c.value, c.status, importId],
      )
      written++
    }

    await client.query('commit')
    console.log(`✓ import #${importId} · ${metrics.length} metric definitions · ${written} monthly values`)
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
