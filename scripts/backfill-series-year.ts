/**
 * scripts/backfill-series-year.ts
 *
 * Sets `year` on each series from the sermons it contains.
 *
 * The import only set `year` where the mapping already knew one, so most of the
 * 68 imported series have it empty. That is not merely cosmetic: the sidebar
 * sorted on `-year`, and Postgres orders NULLs FIRST descending, so year-less
 * archive series from 2016 were listed above the current series.
 *
 * The year used is that of the EARLIEST sermon in the series — a series is
 * named for when it began. "Christmas 2025" runs 30 Nov 2025 to 4 Jan 2026 and
 * should read 2025, which taking the earliest gives and taking the latest does
 * not.
 *
 * Series whose sermons all lack dates keep `year` empty. There is nothing to
 * infer from, and the sidebar now sorts nulls last regardless.
 *
 * Usage:
 *   pnpm backfill:series-year
 *   pnpm backfill:series-year --apply
 *   pnpm backfill:series-year --apply --overwrite   # also correct existing years
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

async function main() {
  loadEnv()
  const doApply = process.argv.includes('--apply')
  const overwrite = process.argv.includes('--overwrite')

  const { getPayload } = await import('payload')
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  const [seriesRes, sermonsRes] = await Promise.all([
    payload.find({
      collection: 'series',
      limit: 500,
      depth: 0,
      draft: true,
      overrideAccess: true,
      select: { title: true, year: true },
    }),
    payload.find({
      collection: 'sermons',
      limit: 5000,
      depth: 0,
      draft: true,
      overrideAccess: true,
      select: { date: true, series: true },
    }),
  ])

  // earliest dated sermon per series
  const earliest = new Map<string, string>()
  let undatedSermons = 0
  for (const s of sermonsRes.docs as Array<Record<string, any>>) {
    if (!s.series) continue
    if (!s.date) {
      undatedSermons++
      continue
    }
    const key = String(typeof s.series === 'object' ? s.series.id : s.series)
    const d = String(s.date).slice(0, 10)
    if (!earliest.has(key) || d < earliest.get(key)!) earliest.set(key, d)
  }

  console.log(
    `${seriesRes.docs.length} series · ${sermonsRes.docs.length} sermons ` +
      `(${undatedSermons} undated, ignored)\n`,
  )

  interface Change {
    id: string
    title: string
    from: number | null
    to: number
  }
  const changes: Change[] = []
  const noEvidence: string[] = []
  const alreadyRight: string[] = []

  for (const s of seriesRes.docs as Array<Record<string, any>>) {
    const id = String(s.id)
    const current = (s.year as number | null) ?? null
    const found = earliest.get(id)
    if (!found) {
      noEvidence.push(s.title as string)
      continue
    }
    const year = Number(found.slice(0, 4))
    if (current === year) {
      alreadyRight.push(s.title as string)
      continue
    }
    if (current !== null && !overwrite) {
      console.log(`  = ${s.title}: keeping ${current} (earliest sermon says ${year}) — use --overwrite to change`)
      continue
    }
    changes.push({ id, title: s.title as string, from: current, to: year })
  }

  console.log(`\n${changes.length} to set · ${alreadyRight.length} already correct · ${noEvidence.length} with no dated sermons`)

  if (changes.length > 0) {
    console.log('')
    for (const c of changes.slice(0, 40)) {
      console.log(`  ${String(c.to)}  ${c.from === null ? '(was empty)' : `(was ${c.from})`}  ${c.title}`)
    }
    if (changes.length > 40) console.log(`  …and ${changes.length - 40} more`)
  }

  if (noEvidence.length > 0) {
    console.log(`\nNo dated sermons — year left empty, will sort last:`)
    for (const t of noEvidence.slice(0, 25)) console.log(`  ${t}`)
    if (noEvidence.length > 25) console.log(`  …and ${noEvidence.length - 25} more`)
  }

  if (!doApply) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.')
    process.exit(0)
  }

  let done = 0
  for (const c of changes) {
    await payload.update({
      collection: 'series',
      id: c.id as never,
      data: { year: c.to },
      overrideAccess: true,
    })
    done++
  }
  console.log(`\n✓ ${done} series updated.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
