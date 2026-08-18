/**
 * scripts/backfill-sort-date.ts
 *
 * One-off. `sortDate` is computed by a beforeChange hook, so it only populates
 * when a sermon is saved. Sermons that already existed when the field was added
 * have it empty — and an empty sortDate sorts FIRST on the listing, which is
 * precisely what the field exists to prevent.
 *
 * Re-saves any sermon missing it. Safe to run repeatedly; sermons that already
 * have a sortDate are skipped.
 *
 * Usage:
 *   pnpm backfill:sortdate            # dry run
 *   pnpm backfill:sortdate --apply
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

const SENTINEL = new Date('1900-01-01').toISOString()

async function main() {
  loadEnv()
  const doApply = process.argv.includes('--apply')

  const { getPayload } = await import('payload')
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'sermons',
    limit: 5000,
    depth: 0,
    draft: true,
    overrideAccess: true,
    select: { title: true, date: true, sortDate: true },
  })

  const needing = res.docs.filter((d) => !(d as Record<string, unknown>).sortDate)
  console.log(`${res.docs.length} sermons · ${needing.length} missing sortDate`)

  if (needing.length === 0) {
    console.log('Nothing to do.')
    process.exit(0)
  }

  if (!doApply) {
    for (const d of needing.slice(0, 20)) {
      const doc = d as Record<string, any>
      console.log(`  ${doc.date ? String(doc.date).slice(0, 10) : 'no date'}  ${doc.title}`)
    }
    if (needing.length > 20) console.log(`  …and ${needing.length - 20} more`)
    console.log('\nDRY RUN — re-run with --apply.')
    process.exit(0)
  }

  let done = 0
  for (const d of needing) {
    const doc = d as Record<string, any>
    await payload.update({
      collection: 'sermons',
      id: doc.id,
      // The hook derives sortDate from `date`; passing it explicitly keeps this
      // correct even if the hook is later changed or removed.
      data: { sortDate: doc.date ?? SENTINEL },
      overrideAccess: true,
      draft: doc._status !== 'published',
    })
    done++
    if (done % 50 === 0) console.log(`  ${done}/${needing.length}`)
  }

  console.log(`\n✓ ${done} sermons updated.`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
