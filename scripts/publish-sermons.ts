/**
 * scripts/publish-sermons.ts
 *
 * Publishes draft sermons in bulk.
 *
 * `import:sermons --publish` only affects records it creates, so drafts that
 * already exist need this. Failures are collected and reported rather than
 * aborting the run: with hundreds of records, one bad row should not stop the
 * other 585.
 *
 * Revalidation is suppressed during the loop — hundreds of cache invalidations
 * would be pointless churn — and the tag is dropped once at the end.
 *
 * Usage:
 *   pnpm publish:sermons                  # dry run
 *   pnpm publish:sermons --apply
 *   pnpm publish:sermons --apply --dated-only   # only those with a date
 *   pnpm publish:sermons --apply --limit=50     # toe in the water
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
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

/** Payload nests field errors in err.data.errors; the top-level message is a summary. */
function describe(err: unknown): string {
  const e = err as { message?: string; data?: { errors?: Array<{ path?: string; message?: string }> } }
  if (e?.data?.errors?.length) {
    return e.data.errors.map((fe) => `${fe.path ?? '?'}: ${fe.message ?? ''}`.trim()).join(' | ')
  }
  return e?.message ?? String(err)
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const doApply = args.includes('--apply')
  const datedOnly = args.includes('--dated-only')
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity

  const { getPayload } = await import('payload')
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'sermons',
    where: { _status: { equals: 'draft' } },
    limit: 5000,
    depth: 0,
    draft: true,
    overrideAccess: true,
    sort: '-sortDate',
    select: { title: true, slug: true, date: true },
  })

  let targets = res.docs as Array<Record<string, any>>
  if (datedOnly) targets = targets.filter((d) => d.date)
  targets = targets.slice(0, limit)

  const undated = targets.filter((d) => !d.date).length
  console.log(`${res.docs.length} drafts · publishing ${targets.length} (${undated} undated)\n`)

  if (!doApply) {
    for (const d of targets.slice(0, 15)) {
      console.log(`  ${(d.date ? String(d.date).slice(0, 10) : 'undated').padEnd(10)}  ${d.title}`)
    }
    if (targets.length > 15) console.log(`  …and ${targets.length - 15} more`)
    console.log('\nDRY RUN — nothing published. Re-run with --apply.')
    process.exit(0)
  }

  const failures: Array<{ id: string; title: string; slug: string; reason: string }> = []
  let ok = 0

  for (const d of targets) {
    try {
      await payload.update({
        collection: 'sermons',
        id: d.id,
        data: { _status: 'published' },
        overrideAccess: true,
        // One invalidation at the end, not 586 during the loop.
        context: { disableRevalidate: true },
      })
      ok++
      if (ok % 50 === 0) console.log(`  ${ok}/${targets.length}`)
    } catch (err) {
      failures.push({ id: String(d.id), title: String(d.title), slug: String(d.slug), reason: describe(err) })
    }
  }

  console.log(`\n✓ ${ok} published`)

  if (failures.length > 0) {
    console.log(`✗ ${failures.length} failed\n`)
    const byReason = new Map<string, typeof failures>()
    for (const f of failures) byReason.set(f.reason, [...(byReason.get(f.reason) ?? []), f])
    for (const [reason, group] of [...byReason].sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${group.length}×  ${reason}`)
      for (const f of group.slice(0, 3)) console.log(`         ${f.title} (${f.slug})`)
      console.log('')
    }

    mkdirSync(resolve(ROOT, 'reports'), { recursive: true })
    const p = resolve(ROOT, `reports/publish-failures-${new Date().toISOString().slice(0, 10)}.json`)
    writeFileSync(p, JSON.stringify(failures, null, 2))
    console.log(`  Detail: ${p.replace(ROOT, '.')}`)
  }

  console.log('\nRun `pnpm sermons:status` to confirm, and reload /sermons.')
  console.log('The sidebar facets may lag one request — the cache serves stale then refreshes.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
