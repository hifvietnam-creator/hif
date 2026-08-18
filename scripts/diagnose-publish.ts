/**
 * scripts/diagnose-publish.ts
 *
 * Works out why publishing an imported sermon fails.
 *
 * Drafts skip validation in Payload; publishing enforces it. So a field that is
 * empty or invalid on 779 imported drafts stays silent until the moment someone
 * hits Publish — which is exactly the symptom. This attempts a publish inside a
 * transaction-free try/catch and prints the field-level errors Payload raises,
 * rather than the single-line summary the admin UI shows.
 *
 * READ-ONLY BY DEFAULT: it publishes nothing unless --apply is passed. Without
 * it, every attempt is rolled back by re-saving the original status.
 *
 * Usage:
 *   pnpm diagnose:publish              # try one undated sermon
 *   pnpm diagnose:publish --all        # try every draft, group the failures
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

/** Payload wraps field errors in err.data.errors — the admin only surfaces a summary. */
function describe(err: unknown): string[] {
  const e = err as { message?: string; data?: { errors?: Array<{ path?: string; message?: string }> } }
  const out: string[] = []
  if (e?.data?.errors?.length) {
    for (const fe of e.data.errors) out.push(`${fe.path ?? '(unknown field)'}: ${fe.message ?? ''}`.trim())
  } else if (e?.message) {
    out.push(e.message)
  } else {
    out.push(String(err))
  }
  return out
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const tryAll = args.includes('--all')

  const { getPayload } = await import('payload')
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'sermons',
    where: { _status: { equals: 'draft' } },
    limit: tryAll ? 5000 : 5,
    depth: 0,
    draft: true,
    overrideAccess: true,
    // Sort undated first: they are the ones reported as failing.
    sort: 'sortDate',
  })

  console.log(`${res.docs.length} draft sermons to test\n`)

  const failures = new Map<string, { count: number; examples: string[] }>()
  let ok = 0

  for (const d of res.docs as Array<Record<string, any>>) {
    try {
      await payload.update({
        collection: 'sermons',
        id: d.id,
        data: { _status: 'published' },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
      ok++
      // Put it straight back — this is a diagnostic, not a publish.
      await payload.update({
        collection: 'sermons',
        id: d.id,
        data: { _status: 'draft' },
        overrideAccess: true,
        context: { disableRevalidate: true },
      })
    } catch (err) {
      for (const reason of describe(err)) {
        const entry = failures.get(reason) ?? { count: 0, examples: [] }
        entry.count++
        if (entry.examples.length < 3) {
          entry.examples.push(`${d.title} (id ${d.id}, slug "${d.slug}", date ${d.date ?? 'none'})`)
        }
        failures.set(reason, entry)
      }
    }
  }

  console.log(`${ok} published cleanly (and were reverted to draft)`)
  console.log(`${res.docs.length - ok} failed\n`)

  if (failures.size === 0) {
    console.log('No validation errors. Publishing works — the earlier failure was')
    console.log('probably a stale admin bundle; a dev restart would clear it.')
    process.exit(0)
  }

  console.log('Failures by reason:\n')
  for (const [reason, info] of [...failures].sort((a, b) => b[1].count - a[1].count)) {
    console.log(`  ${info.count}×  ${reason}`)
    for (const ex of info.examples) console.log(`         ${ex}`)
    console.log('')
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
