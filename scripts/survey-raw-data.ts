/**
 * scripts/survey-raw-data.ts
 *
 * READ-ONLY. Describes what is actually inside the ministry spreadsheets before
 * anyone designs a schema around them.
 *
 * These files are exports from several different systems — Planning Center,
 * Google Forms, hand-kept registers — so their shapes vary a lot. Guessing at
 * columns would waste a day; this reads every sheet, prints the header row, a
 * few sample values and an inferred type per column, and flags the structural
 * traps that matter for import:
 *
 *   · wide date columns (one column per event, e.g. group attendance)
 *   · a title/blank row above the real header
 *   · duplicate or empty column names
 *   · columns that look like personal data
 *
 * Nothing is written to any database.
 *
 * Requires: pnpm add -D xlsx
 *
 * Usage:
 *   pnpm survey:raw
 *   pnpm survey:raw --dir="C:\\path\\to\\folder"
 *   pnpm survey:raw --rows=5
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs'
import { resolve, dirname, join, extname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const DEFAULT_DIR = 'C:\\Users\\serve\\OneDrive\\HIF Data FIles\\2025-26 Raw Data'

// ── helpers ──────────────────────────────────────────────────────────────────

const DATE_HEADER = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/
const EMAIL_COL = /e-?mail/i
const PHONE_COL = /phone|mobile|tel\b/i
const NAME_COL = /name/i

function inferType(values: unknown[]): string {
  const present = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
  if (present.length === 0) return 'empty'
  const all = (pred: (s: string) => boolean) => present.every((v) => pred(String(v).trim()))
  if (all((s) => /^-?\d+$/.test(s))) return 'integer'
  if (all((s) => /^-?\d*\.?\d+%?$/.test(s))) return 'number'
  if (all((s) => !Number.isNaN(Date.parse(s)) && /\d{4}|\d{1,2}[/-]\d{1,2}/.test(s))) return 'date?'
  if (all((s) => /^(yes|no|true|false|y|n)$/i.test(s))) return 'boolean?'
  const distinct = new Set(present.map((v) => String(v).trim().toLowerCase()))
  if (distinct.size <= Math.max(6, present.length * 0.15)) return `enum(${distinct.size})`
  return 'text'
}

async function main() {
  const args = process.argv.slice(2)
  const dirArg = args.find((a) => a.startsWith('--dir='))
  const rowsArg = args.find((a) => a.startsWith('--rows='))
  const dir = dirArg ? dirArg.slice('--dir='.length).replace(/^"|"$/g, '') : DEFAULT_DIR
  const sampleRows = rowsArg ? Number(rowsArg.split('=')[1]) : 3

  // SheetJS's ESM build does not bind Node's fs, so XLSX.readFile does not
  // exist. Reading the bytes here and handing them to XLSX.read avoids the
  // whole question — and the interop dance below covers both the namespace and
  // default-export shapes the package can present under tsx.
  let XLSX: typeof import('xlsx')
  try {
    const mod = (await import('xlsx')) as unknown as Record<string, unknown>
    XLSX = ((mod.default as typeof import('xlsx')) ?? mod) as typeof import('xlsx')
    if (typeof XLSX.read !== 'function') throw new Error('XLSX.read unavailable')
  } catch (err) {
    console.error(`Could not load the xlsx package: ${(err as Error).message}`)
    console.error('Run:  pnpm add -D xlsx\n')
    process.exit(1)
  }

  const files = readdirSync(dir)
    .filter((f) => ['.xlsx', '.xls', '.csv'].includes(extname(f).toLowerCase()))
    .filter((f) => !f.startsWith('~$')) // Excel lock files
    .sort()

  console.log(`${files.length} files in ${dir}\n`)

  const L: string[] = []
  L.push('# Ministry raw data — survey')
  L.push('')
  L.push(`Generated ${new Date().toISOString()} · **read-only**`)
  L.push('')
  L.push(`Source: \`${dir}\``)
  L.push('')
  L.push('Written before any schema design. Describes what the files actually')
  L.push('contain rather than what their names suggest.')
  L.push('')

  const index: Array<Record<string, unknown>> = []

  for (const file of files) {
    const full = join(dir, file)
    const size = statSync(full).size
    console.log(`  ${file}`)

    let wb: import('xlsx').WorkBook
    try {
      wb = XLSX.read(readFileSync(full), { type: 'buffer', cellDates: true, raw: false })
    } catch (err) {
      L.push(`## ${file}`)
      L.push('')
      L.push(`Could not read: ${(err as Error).message}`)
      L.push('')
      continue
    }

    L.push(`## ${file}`)
    L.push('')
    L.push(`${(size / 1024).toFixed(0)} KB · ${wb.SheetNames.length} sheet(s): ${wb.SheetNames.join(', ')}`)
    L.push('')

    for (const sheetName of wb.SheetNames) {
      const sheet = wb.Sheets[sheetName]
      if (!sheet) continue
      const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, defval: null })
      if (grid.length === 0) {
        L.push(`### ${sheetName} — empty`)
        L.push('')
        continue
      }

      // Exports often carry a title line before the real header. Take the
      // widest row in the first few as the header rather than assuming row 0.
      let headerIdx = 0
      let widest = 0
      for (let i = 0; i < Math.min(5, grid.length); i++) {
        const filled = (grid[i] ?? []).filter((c) => c !== null && String(c).trim() !== '').length
        if (filled > widest) {
          widest = filled
          headerIdx = i
        }
      }

      const header = (grid[headerIdx] ?? []).map((h, i) =>
        h === null || String(h).trim() === '' ? `(col ${i + 1})` : String(h).trim(),
      )
      const body = grid.slice(headerIdx + 1)

      L.push(`### ${sheetName}`)
      L.push('')
      L.push(`${body.length} data rows · ${header.length} columns${headerIdx > 0 ? ` · header on row ${headerIdx + 1}` : ''}`)
      L.push('')

      // ── structural flags ──
      const flags: string[] = []
      const dateCols = header.filter((h) => DATE_HEADER.test(h))
      if (dateCols.length > 1) {
        flags.push(
          `**Wide format**: ${dateCols.length} columns are dates (${dateCols.slice(0, 3).join(', ')}…). ` +
            'One column per event — needs unpivoting into rows before import.',
        )
      }
      const dupes = header.filter((h, i) => header.indexOf(h) !== i)
      if (dupes.length) flags.push(`Duplicate column names: ${[...new Set(dupes)].join(', ')}`)
      const blanks = header.filter((h) => h.startsWith('(col ')).length
      if (blanks) flags.push(`${blanks} unnamed column(s)`)
      const pii = header.filter((h) => EMAIL_COL.test(h) || PHONE_COL.test(h))
      if (pii.length) flags.push(`Personal data: ${pii.join(', ')} — affects where this may be stored`)
      const hasName = header.some((h) => NAME_COL.test(h))
      const hasEmail = header.some((h) => EMAIL_COL.test(h))
      flags.push(
        hasEmail
          ? 'Has an email column — can be matched to PCO people.'
          : hasName
            ? 'Name only, no email — matching to PCO people will be unreliable.'
            : 'No obvious person identifier.',
      )
      for (const f of flags) L.push(`- ${f}`)
      L.push('')

      // ── columns ──
      L.push('| # | Column | Type | Filled | Sample |')
      L.push('|---:|---|---|---:|---|')
      header.forEach((h, i) => {
        const col = body.map((r) => (r as unknown[])?.[i] ?? null)
        const filled = col.filter((v) => v !== null && String(v).trim() !== '').length
        const samples = col
          .filter((v) => v !== null && String(v).trim() !== '')
          .slice(0, sampleRows)
          .map((v) => String(v).slice(0, 28))
        L.push(
          `| ${i + 1} | ${h} | ${inferType(col)} | ${filled}/${body.length} | ${samples.join(' · ') || '—'} |`,
        )
      })
      L.push('')

      index.push({
        file,
        sheet: sheetName,
        rows: body.length,
        columns: header,
        headerRow: headerIdx + 1,
        wideDateColumns: dateCols.length,
        hasEmail,
      })
    }
  }

  mkdirSync(resolve(ROOT, 'reports'), { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)
  writeFileSync(resolve(ROOT, `reports/raw-data-survey-${stamp}.md`), L.join('\n'))
  writeFileSync(
    resolve(ROOT, `reports/raw-data-survey-${stamp}.json`),
    JSON.stringify({ generatedAt: new Date().toISOString(), dir, sheets: index }, null, 2),
  )

  console.log(`\n${index.length} sheets across ${files.length} files`)
  console.log(`Report: ./reports/raw-data-survey-${stamp}.md`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
