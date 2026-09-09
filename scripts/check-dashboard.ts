/**
 * scripts/check-dashboard.ts
 *
 * READ-ONLY. Runs every dashboard query and reports which succeed.
 *
 * Dashboard queries are hand-written SQL against the mirrored PCO/MailerLite
 * schemas. A typo in a column name does not fail at build time — it fails when
 * a staff member opens the page. This runs them all up front, times each one,
 * and shows a sample of what came back, so a broken or empty query is found
 * here rather than in front of someone.
 *
 * An empty result is reported distinctly from an error: "0 rows" may be
 * correct, but it is worth seeing.
 *
 * Usage:
 *   pnpm check:dashboard
 *   pnpm check:dashboard --verbose    # print the first row of each result
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

/** Modules to exercise. Add a line when a new dashboard section lands. */
const MODULES = [
  { name: 'congregation', path: '../src/lib/queries/congregation' },
  { name: 'serving', path: '../src/lib/queries/serving' },
  { name: 'ministries', path: '../src/lib/queries/ministries' },
  { name: 'reachability', path: '../src/lib/queries/reachability' },
  { name: 'attendance', path: '../src/lib/queries/attendance' },
]

function summarise(value: unknown): string {
  if (value === null || value === undefined) return 'null'
  if (typeof value === 'number') return value.toLocaleString()
  if (Array.isArray(value)) return `${value.length} row${value.length === 1 ? '' : 's'}`
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>
    if (Array.isArray(o.rows)) return `${(o.rows as unknown[]).length} rows + meta`
    return `{${Object.keys(o).slice(0, 4).join(', ')}${Object.keys(o).length > 4 ? ', …' : ''}}`
  }
  return String(value)
}

function isEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0
  if (value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).rows)) {
    return ((value as Record<string, unknown>).rows as unknown[]).length === 0
  }
  return false
}

async function main() {
  loadEnv()
  const verbose = process.argv.includes('--verbose')

  let failed = 0
  let empty = 0
  let ok = 0

  for (const mod of MODULES) {
    console.log(`\n  ${mod.name}`)
    console.log(`  ${'─'.repeat(64)}`)

    let loaded: Record<string, unknown>
    try {
      loaded = (await import(mod.path)) as Record<string, unknown>
    } catch (err) {
      console.log(`  ✗ could not load module: ${(err as Error).message}`)
      failed++
      continue
    }

    const fns = Object.entries(loaded).filter(
      ([name, v]) => typeof v === 'function' && name.startsWith('get'),
    ) as Array<[string, (...a: unknown[]) => Promise<unknown>]>

    if (fns.length === 0) console.log('  (no exported get* functions)')

    for (const [name, fn] of fns) {
      const started = Date.now()
      try {
        const result = await fn()
        const ms = Date.now() - started
        const slow = ms > 1500 ? '  ⚠ slow' : ''
        if (isEmpty(result)) {
          console.log(`  ○ ${name.padEnd(28)} ${summarise(result).padEnd(18)} ${ms}ms — EMPTY${slow}`)
          empty++
        } else {
          console.log(`  ✓ ${name.padEnd(28)} ${summarise(result).padEnd(18)} ${ms}ms${slow}`)
          ok++
        }
        if (verbose) {
          const sample = Array.isArray(result)
            ? result[0]
            : (result as Record<string, unknown>)?.rows
              ? ((result as Record<string, unknown>).rows as unknown[])[0]
              : result
          console.log(`      ${JSON.stringify(sample)?.slice(0, 160) ?? ''}`)
        }
      } catch (err) {
        console.log(`  ✗ ${name.padEnd(28)} ${(err as Error).message}`)
        failed++
      }
    }
  }

  console.log(`\n  ${ok} ok · ${empty} empty · ${failed} failed\n`)

  if (failed > 0) {
    console.log('  Failures are usually a wrong column or table name. Check against')
    console.log('  migrations/analytics/*.sql — that is the authoritative schema.\n')
    process.exit(1)
  }
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
