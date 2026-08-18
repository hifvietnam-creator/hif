/**
 * scripts/import-sermons.ts
 *
 * Job 2, final step: create the sermons that exist on hif.vn but not in Payload.
 *
 * Reads only reviewed artefacts — the reconciliation report plus the two mapping
 * files — so nothing guessed during analysis can reach the database without
 * having passed through a file a human looked at.
 *
 * Safety:
 *   · dry run unless --apply
 *   · refuses to start while any mapping entry is still marked "review"
 *   · never creates a sermon whose youtubeURL or audioURL already exists, so
 *     re-running is safe and cannot duplicate
 *   · sermons with neither video nor audio are skipped by default: they have no
 *     stable key, so a second run could not recognise them (--include-keyless)
 *   · creates as drafts unless --publish
 *
 * Usage:
 *   pnpm import:sermons                      # dry run
 *   pnpm import:sermons --apply              # create as drafts
 *   pnpm import:sermons --apply --publish    # create and publish
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

const SENTINEL_DATE = new Date('1900-01-01').toISOString()

// ── Types ─────────────────────────────────────────────────────────────────────

interface WebsiteSermon {
  postSlug: string
  seriesTitle: string
  era: string
  index: number
  title: string | null
  speaker: string | null
  campus: string | null
  date: string | null
  dateSource: string
  videoId: string | null
  audioUrl: string | null
  slidesUrl: string | null
  discussionUrl: string | null
}

interface ReportRow {
  website: WebsiteSermon
  status: string
  payloadId?: string | number
}

interface SpeakerEntry {
  canonical: string
  action: 'link' | 'create' | 'review'
  teamId: string | null
  role?: string
  staffMember?: boolean
  variants: string[]
}

interface SeriesEntry {
  postSlug: string
  action: 'link' | 'create' | 'review'
  seriesId: string | null
  seriesTitle: string | null
  year: number | null
}

function latestReport(): string {
  const dir = resolve(ROOT, 'reports')
  const files = readdirSync(dir)
    .filter((f) => f.startsWith('sermon-reconciliation-full-') && f.endsWith('.json'))
    .sort()
  if (files.length === 0) throw new Error('No report found. Run `pnpm compare:sermons:all` first.')
  return resolve(dir, files[files.length - 1]!)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70)
    .replace(/-$/, '')
}

/**
 * Most archive entries have no title — the website wrote "Sermon by X | Campus
 * | Date" and nothing more. `title` is required, so one is composed from what
 * is known, mirroring how the site itself described them.
 */
function deriveTitle(w: WebsiteSermon, speakerName: string | null, seriesTitle: string): string {
  if (w.title && w.title.trim()) return w.title.trim()
  const who = speakerName ?? w.speaker
  if (who) return w.campus ? `Sermon by ${who} · ${w.campus}` : `Sermon by ${who}`
  return w.campus ? `${seriesTitle} · ${w.campus}` : `${seriesTitle} sermon`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const doApply = args.includes('--apply')
  const publish = args.includes('--publish')
  const includeKeyless = args.includes('--include-keyless')

  const reportPath = latestReport()
  const { rows } = JSON.parse(readFileSync(reportPath, 'utf8')) as { rows: ReportRow[] }

  const speakerMap = JSON.parse(
    readFileSync(resolve(ROOT, 'config/sermon-speaker-map.json'), 'utf8'),
  ) as { defaultRole?: string; coSpeakers?: Record<string, string>; speakers: SpeakerEntry[] }
  const seriesMap = JSON.parse(
    readFileSync(resolve(ROOT, 'config/sermon-series-map.json'), 'utf8'),
  ) as { posts: SeriesEntry[] }

  console.log(`Report:  ${reportPath.replace(ROOT, '.')}`)
  console.log(`Speakers: ${speakerMap.speakers.length} · Series: ${seriesMap.posts.length}\n`)

  // ── refuse to run on unreviewed mappings ──
  const unresolvedSpeakers = speakerMap.speakers.filter((s) => s.action === 'review')
  const unresolvedSeries = seriesMap.posts.filter((p) => p.action === 'review')
  if (unresolvedSpeakers.length || unresolvedSeries.length) {
    console.error('Refusing to run — unresolved mappings:\n')
    for (const s of unresolvedSpeakers) console.error(`  speaker  ${s.canonical}`)
    for (const p of unresolvedSeries) console.error(`  series   ${p.postSlug}`)
    console.error('\nResolve them in the overrides files, re-run the analyze scripts, then retry.')
    process.exit(1)
  }

  // ── raw speaker string → cluster ──
  const speakerByVariant = new Map<string, SpeakerEntry>()
  for (const s of speakerMap.speakers) {
    for (const v of s.variants) speakerByVariant.set(v.trim().toLowerCase(), s)
  }
  const seriesByPost = new Map(seriesMap.posts.map((p) => [p.postSlug, p]))

  const { getPayload } = await import('payload')
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  // ── existing sermons, for idempotency ──
  const existing = await payload.find({
    collection: 'sermons',
    limit: 5000,
    depth: 0,
    draft: true,
    overrideAccess: true,
    select: { youtubeURL: true, audioURL: true, slug: true },
  })
  const takenVideo = new Set<string>()
  const takenAudio = new Set<string>()
  const takenSlug = new Set<string>()
  for (const d of existing.docs as Array<Record<string, any>>) {
    const vid = d.youtubeURL?.match(/([A-Za-z0-9_-]{11})(?:$|[&?])/)?.[1]
    if (vid) takenVideo.add(vid)
    if (d.audioURL) takenAudio.add(String(d.audioURL))
    if (d.slug) takenSlug.add(String(d.slug))
  }
  console.log(`Payload already holds ${existing.docs.length} sermons\n`)

  // ── work out what to create ──
  const candidates = rows.filter((r) => !r.status.startsWith('matched'))
  const plan: Array<{ row: ReportRow; reason?: string; skip?: boolean }> = []
  for (const r of candidates) {
    const w = r.website
    if (!w.videoId && !w.audioUrl && !includeKeyless) {
      plan.push({ row: r, skip: true, reason: 'no video or audio — no stable key for re-runs' })
      continue
    }
    if (w.videoId && takenVideo.has(w.videoId)) {
      plan.push({ row: r, skip: true, reason: 'video already in Payload' })
      continue
    }
    if (!w.videoId && w.audioUrl && takenAudio.has(w.audioUrl)) {
      plan.push({ row: r, skip: true, reason: 'audio already in Payload' })
      continue
    }
    plan.push({ row: r })
  }

  const toCreate = plan.filter((p) => !p.skip)
  const skipped = plan.filter((p) => p.skip)
  console.log(`${candidates.length} sermons on the website are absent from Payload`)
  console.log(`  ${toCreate.length} will be created`)
  console.log(`  ${skipped.length} skipped`)
  for (const reason of new Set(skipped.map((s) => s.reason))) {
    console.log(`     ${skipped.filter((s) => s.reason === reason).length} — ${reason}`)
  }

  // ── which team members / series need creating ──
  const speakersNeeded = new Set<string>()
  const seriesNeeded = new Set<string>()
  for (const { row } of toCreate) {
    const sp = row.website.speaker ? speakerByVariant.get(row.website.speaker.trim().toLowerCase()) : null
    if (sp && sp.action === 'create') speakersNeeded.add(sp.canonical)
    const se = seriesByPost.get(row.website.postSlug)
    if (se && se.action === 'create') seriesNeeded.add(se.postSlug)
  }
  console.log(`\n  ${speakersNeeded.size} team members to create`)
  console.log(`  ${seriesNeeded.size} series to create`)

  if (!doApply) {
    console.log('\nSample of what would be created:\n')
    for (const { row } of toCreate.slice(0, 15)) {
      const w = row.website
      const sp = w.speaker ? speakerByVariant.get(w.speaker.trim().toLowerCase()) : null
      const se = seriesByPost.get(w.postSlug)
      const title = deriveTitle(w, sp?.canonical ?? null, se?.seriesTitle ?? w.seriesTitle)
      console.log(`  ${(w.date ?? 'undated').padEnd(10)}  ${title}`)
      console.log(`              ${sp?.canonical ?? 'no speaker'} · ${se?.seriesTitle ?? '?'}`)
    }
    if (toCreate.length > 15) console.log(`  …and ${toCreate.length - 15} more`)
    console.log(`\nDRY RUN — nothing written. Re-run with --apply${publish ? ' --publish' : ''}.`)
    process.exit(0)
  }

  // ── create team members ──
  const teamIdByCanonical = new Map<string, string>()
  for (const s of speakerMap.speakers) {
    if (s.action === 'link' && s.teamId) teamIdByCanonical.set(s.canonical, s.teamId)
  }
  for (const canonical of speakersNeeded) {
    const entry = speakerMap.speakers.find((s) => s.canonical === canonical)!
    const created = await payload.create({
      collection: 'team',
      data: {
        name: canonical,
        role: entry.role ?? speakerMap.defaultRole ?? 'Guest Speaker',
        // Keeps historical preachers off the public About page, which queries
        // staffMember: true.
        staffMember: entry.staffMember ?? false,
      },
      overrideAccess: true,
    })
    teamIdByCanonical.set(canonical, String(created.id))
  }
  console.log(`\n✓ ${speakersNeeded.size} team members created`)

  // ── create series ──
  const seriesIdByPost = new Map<string, string>()
  for (const p of seriesMap.posts) {
    if (p.action === 'link' && p.seriesId) seriesIdByPost.set(p.postSlug, p.seriesId)
  }
  for (const postSlug of seriesNeeded) {
    const entry = seriesByPost.get(postSlug)!
    const created = await payload.create({
      collection: 'series',
      data: {
        title: entry.seriesTitle ?? postSlug,
        ...(entry.year ? { year: entry.year } : {}),
      },
      overrideAccess: true,
    })
    seriesIdByPost.set(postSlug, String(created.id))
  }
  console.log(`✓ ${seriesNeeded.size} series created`)

  // ── create sermons ──
  const audit: Array<Record<string, unknown>> = []
  let created = 0
  let failed = 0

  for (const { row } of toCreate) {
    const w = row.website
    const sp = w.speaker ? speakerByVariant.get(w.speaker.trim().toLowerCase()) : null
    const se = seriesByPost.get(w.postSlug)
    const speakerId = sp ? teamIdByCanonical.get(sp.canonical) : undefined
    const seriesId = se ? seriesIdByPost.get(se.postSlug) : undefined
    const seriesTitle = se?.seriesTitle ?? w.seriesTitle
    const title = deriveTitle(w, sp?.canonical ?? null, seriesTitle)

    // Slugs must be unique. Title alone collides constantly here — the same
    // "Sermon by X" appears dozens of times — so the key is folded in.
    const suffix = w.videoId ?? (w.audioUrl ? String(Math.abs(hash(w.audioUrl))) : `${w.postSlug}-${w.index}`)
    let slug = `${slugify(title)}-${slugify(suffix)}`.slice(0, 90)
    while (takenSlug.has(slug)) slug = `${slug}-x`
    takenSlug.add(slug)

    const coSpeaker = w.speaker
      ? (speakerMap.coSpeakers ?? {})[w.speaker.trim().toLowerCase()]
      : undefined

    const data: Record<string, unknown> = {
      title,
      slug,
      date: w.date ?? null,
      sortDate: w.date ?? SENTINEL_DATE,
      ...(speakerId ? { speaker: Number.isNaN(Number(speakerId)) ? speakerId : Number(speakerId) } : {}),
      ...(seriesId ? { series: Number.isNaN(Number(seriesId)) ? seriesId : Number(seriesId) } : {}),
      ...(w.videoId ? { youtubeURL: `https://www.youtube.com/watch?v=${w.videoId}` } : {}),
      ...(w.audioUrl ? { audioURL: w.audioUrl } : {}),
      ...(w.slidesUrl ? { sermonPdfUrl: w.slidesUrl } : {}),
      ...(w.discussionUrl ? { discussionQuestions: { type: 'url', url: w.discussionUrl } } : {}),
      ...(coSpeaker ? { description: `Also preaching: ${coSpeaker}.` } : {}),
      _status: publish ? 'published' : 'draft',
    }

    try {
      const doc = await payload.create({ collection: 'sermons', data, overrideAccess: true })
      created++
      audit.push({ id: doc.id, slug, title, date: w.date, postSlug: w.postSlug })
      if (created % 50 === 0) console.log(`  ${created}/${toCreate.length}`)
    } catch (err) {
      failed++
      audit.push({ error: (err as Error).message, title, postSlug: w.postSlug, index: w.index })
      if (failed <= 5) console.error(`  ! ${title}: ${(err as Error).message}`)
    }
  }

  mkdirSync(resolve(ROOT, 'reports'), { recursive: true })
  const auditPath = resolve(
    ROOT,
    `reports/sermon-import-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
  )
  writeFileSync(
    auditPath,
    JSON.stringify(
      { ranAt: new Date().toISOString(), published: publish, created, failed, skipped: skipped.length, audit },
      null,
      2,
    ),
  )

  console.log(`\n✓ ${created} sermons created${publish ? ' and published' : ' as drafts'}`)
  if (failed) console.log(`✗ ${failed} failed — see the audit`)
  console.log(`Audit: ${auditPath.replace(ROOT, '.')}`)
  process.exit(0)
}

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
