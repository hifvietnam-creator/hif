/**
 * scripts/apply-sermon-links.ts
 *
 * Job 1: backfill resource links from hif.vn onto Sermons that already exist in
 * Payload. Applies exactly what `compare:sermons:all` proposed — no scraping
 * happens here, so what you reviewed is what gets written.
 *
 * Safety rules, all on by default:
 *   · dry run unless --apply is passed
 *   · only sermons the report matched by video id or audio url
 *   · only fields that are EMPTY in the database right now (re-read live, the
 *     report may be stale) — nothing is ever overwritten without --overwrite
 *   · a URL proposed for more than one sermon is REFUSED, because on this site
 *     that has always meant a copy-paste slip rather than a shared file
 *   · every run writes an audit file, including dry runs
 *
 * Usage:
 *   pnpm apply:sermon-links                 # dry run, prints what would change
 *   pnpm apply:sermon-links --apply         # write it
 *   pnpm apply:sermon-links --apply --overwrite
 *   pnpm apply:sermon-links --report=reports/sermon-reconciliation-full-2026-08-05.json
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs'
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

interface ReportRow {
  website: {
    postSlug: string
    seriesTitle: string
    date: string | null
    title: string | null
    videoId: string | null
    audioUrl: string | null
  }
  status: string
  payloadId?: string | number
  payloadTitle?: string
  proposed: Array<{ field: string; from: string | null; to: string }>
}

/**
 * OneDrive sometimes wraps a share link in a redirect whose query carries the
 * real URL as base64. Unwrapping is lossless and leaves a link that is readable
 * in the admin UI instead of an opaque blob.
 */
function normalizeUrl(url: string): { url: string; note?: string } {
  const m = url.match(/[?&]redeem=([A-Za-z0-9+/=_-]+)/)
  if (!m) return { url }
  try {
    const decoded = Buffer.from(m[1]!.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    if (/^https?:\/\//.test(decoded)) {
      return { url: decoded, note: 'unwrapped OneDrive redeem redirect' }
    }
  } catch {
    /* leave as-is */
  }
  return { url }
}

function latestReport(): string {
  const dir = resolve(ROOT, 'reports')
  const files = readdirSync(dir)
    .filter((f) => f.startsWith('sermon-reconciliation-full-') && f.endsWith('.json'))
    .sort()
  if (files.length === 0) {
    throw new Error('No report found. Run `pnpm compare:sermons:all` first.')
  }
  return resolve(dir, files[files.length - 1]!)
}

async function main() {
  loadEnv()

  const args = process.argv.slice(2)
  const doApply = args.includes('--apply')
  const overwrite = args.includes('--overwrite')
  const allowDuplicates = args.includes('--allow-duplicates')
  const reportArg = args.find((a) => a.startsWith('--report='))

  const reportPath = reportArg ? resolve(ROOT, reportArg.slice('--report='.length)) : latestReport()
  console.log(`Report: ${reportPath}`)

  const report = JSON.parse(readFileSync(reportPath, 'utf8')) as { rows: ReportRow[] }
  const candidates = report.rows.filter(
    (r) => r.status.startsWith('matched') && r.payloadId != null && r.proposed.length > 0,
  )
  console.log(`${candidates.length} matched sermons carry proposed changes\n`)

  // ── refuse URLs proposed for more than one sermon ──
  const urlOwners = new Map<string, Set<string | number>>()
  for (const r of candidates) {
    for (const p of r.proposed) {
      const { url } = normalizeUrl(p.to)
      if (!urlOwners.has(url)) urlOwners.set(url, new Set())
      urlOwners.get(url)!.add(r.payloadId!)
    }
  }
  const duplicated = new Set(
    [...urlOwners].filter(([, owners]) => owners.size > 1).map(([url]) => url),
  )
  if (duplicated.size > 0) {
    console.log(`⚠ ${duplicated.size} URL(s) are proposed for more than one sermon:`)
    for (const url of duplicated) {
      const ids = [...urlOwners.get(url)!]
      console.log(`   ${url}`)
      console.log(`     → sermons ${ids.join(', ')}`)
    }
    console.log(
      allowDuplicates
        ? '   --allow-duplicates given: they WILL be written.\n'
        : '   These are skipped. Fix the website, or pass --allow-duplicates.\n',
    )
  }

  const { getPayload } = await import('payload')
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  interface Action {
    sermonId: string | number
    payloadTitle?: string
    date: string | null
    series: string
    field: string
    from: string | null
    to: string
    decision: 'apply' | 'skip-duplicate' | 'skip-occupied' | 'skip-unchanged'
    note?: string
  }
  const actions: Action[] = []

  for (const r of candidates) {
    const existing = (await payload.findByID({
      collection: 'sermons',
      id: r.payloadId as never,
      depth: 0,
      overrideAccess: true,
    })) as Record<string, any> | null
    if (!existing) {
      console.log(`  ! sermon ${r.payloadId} no longer exists — skipped`)
      continue
    }

    const update: Record<string, any> = {}

    for (const p of r.proposed) {
      const { url, note } = normalizeUrl(p.to)
      const base: Omit<Action, 'decision'> = {
        sermonId: r.payloadId!,
        payloadTitle: existing.title,
        date: r.website.date,
        series: r.website.seriesTitle,
        field: p.field,
        from: null,
        to: url,
        note,
      }

      // Read the live value rather than trusting the report.
      const current: string | null =
        p.field === 'sermonPdfUrl' ? (existing.sermonPdfUrl ?? null)
        : p.field === 'discussionQuestions.url' ? (existing.discussionQuestions?.url ?? null)
        : p.field === 'audioURL' ? (existing.audioURL ?? null)
        : null
      base.from = current

      if (current === url) {
        actions.push({ ...base, decision: 'skip-unchanged' })
        continue
      }
      if (duplicated.has(url) && !allowDuplicates) {
        actions.push({ ...base, decision: 'skip-duplicate' })
        continue
      }
      if (current && !overwrite) {
        actions.push({ ...base, decision: 'skip-occupied' })
        continue
      }

      if (p.field === 'sermonPdfUrl') update.sermonPdfUrl = url
      else if (p.field === 'audioURL') update.audioURL = url
      else if (p.field === 'discussionQuestions.url') {
        // Merge, so an existing uploaded file or typed questions survive.
        update.discussionQuestions = {
          ...(existing.discussionQuestions ?? {}),
          type: 'url',
          url,
        }
      }
      actions.push({ ...base, decision: 'apply' })
    }

    if (doApply && Object.keys(update).length > 0) {
      await payload.update({
        collection: 'sermons',
        id: r.payloadId as never,
        data: update,
        overrideAccess: true,
        // Preserve whatever publication state the record was already in.
        draft: existing._status !== 'published',
      })
    }
  }

  // ── output ──
  const applied = actions.filter((a) => a.decision === 'apply')
  const byDecision = (d: Action['decision']) => actions.filter((a) => a.decision === d).length

  console.log('| Date       | Series               | Field                    | Decision |')
  console.log('|------------|----------------------|--------------------------|----------|')
  for (const a of actions) {
    console.log(
      `| ${(a.date ?? '?').padEnd(10)} | ${a.series.slice(0, 20).padEnd(20)} | ` +
        `${a.field.padEnd(24)} | ${a.decision} |`,
    )
  }

  console.log('')
  console.log(`  apply           ${byDecision('apply')}`)
  console.log(`  skip-duplicate  ${byDecision('skip-duplicate')}`)
  console.log(`  skip-occupied   ${byDecision('skip-occupied')}`)
  console.log(`  skip-unchanged  ${byDecision('skip-unchanged')}`)

  const notes = actions.filter((a) => a.note)
  if (notes.length > 0) {
    console.log(`\n  ${notes.length} URL(s) normalized (${notes[0]!.note})`)
  }

  mkdirSync(resolve(ROOT, 'reports'), { recursive: true })
  const auditPath = resolve(
    ROOT,
    `reports/link-backfill-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
  )
  writeFileSync(
    auditPath,
    JSON.stringify({ ranAt: new Date().toISOString(), applied: doApply, reportPath, actions }, null, 2),
  )
  console.log(`\nAudit written to ${auditPath.replace(ROOT, '.')}`)

  if (doApply) {
    console.log(`\n✓ ${applied.length} field(s) written to Payload.`)
  } else {
    console.log(`\nDRY RUN — nothing was written. Re-run with --apply to write ${applied.length} field(s).`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
