/**
 * scripts/analyze-sermon-series.ts
 *
 * READ-ONLY. Job 2, step 2.
 *
 * Maps the 74 hif.vn sermon posts onto the `series` collection. Harder than it
 * sounds for two reasons:
 *
 *   1. A post's title is not the series name. The post "Turn it to praise"
 *      holds the series Payload calls "Story of The Psalms". Title matching
 *      alone cannot bridge that, so unmatched posts are surfaced for a human
 *      rather than guessed at.
 *   2. Four series names are reused across different years — GOD WITH US,
 *      CHARACTER COUNTS, JONAH, The Blessed Life. Matching on name alone would
 *      merge a 2015 series with a 2025 one, so the date range is carried
 *      through and any name collision is flagged.
 *
 * Decisions belong in config/sermon-series-overrides.json, which survives
 * re-runs. The generated map is overwritten every time.
 *
 * Outputs:
 *   reports/series-mapping-<date>.md    — review this
 *   config/sermon-series-map.json       — the importer reads this
 *
 * Usage: pnpm analyze:series
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'fs'
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

/** Editorial noise that appears in post titles but never in a series name. */
const TITLE_NOISE =
  /^(new\s+)?sermon\s+series\s*[:—–-]?\s*|^new\s+series\s*[:—–-]?\s*|\s+sermon\s+series$|\s+series$/gi

function normalize(title: string): string {
  return title
    .replace(TITLE_NOISE, ' ')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length || !b.length) return Math.max(a.length, b.length)
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = curr
  }
  return prev[b.length]!
}

interface ReportRow {
  website: {
    postSlug: string
    seriesTitle: string
    era: string
    date: string | null
    videoId: string | null
    audioUrl: string | null
  }
  status: string
}

interface PostGroup {
  postSlug: string
  postTitle: string
  era: string
  sermonCount: number
  withVideo: number
  withAudio: number
  matchedInPayload: number
  firstSeen: string | null
  lastSeen: string | null
  seriesId: string | null
  seriesTitle: string | null
  confidence: 'exact' | 'fuzzy' | 'override' | 'none'
  action: 'link' | 'create' | 'review'
  notes: string[]
}

function latestReport(): string {
  const dir = resolve(ROOT, 'reports')
  const files = readdirSync(dir)
    .filter((f) => f.startsWith('sermon-reconciliation-full-') && f.endsWith('.json'))
    .sort()
  if (files.length === 0) throw new Error('No report found. Run `pnpm compare:sermons:all` first.')
  return resolve(dir, files[files.length - 1]!)
}

async function main() {
  loadEnv()

  const args = process.argv.slice(2)
  const reportArg = args.find((a) => a.startsWith('--report='))
  const reportPath = reportArg ? resolve(ROOT, reportArg.slice('--report='.length)) : latestReport()
  console.log(`Report: ${reportPath}`)

  const { rows } = JSON.parse(readFileSync(reportPath, 'utf8')) as { rows: ReportRow[] }

  // ── group sermons by their source post ──
  const posts = new Map<string, PostGroup>()
  for (const r of rows) {
    const slug = r.website.postSlug
    if (!posts.has(slug)) {
      posts.set(slug, {
        postSlug: slug,
        postTitle: r.website.seriesTitle,
        era: r.website.era,
        sermonCount: 0,
        withVideo: 0,
        withAudio: 0,
        matchedInPayload: 0,
        firstSeen: null,
        lastSeen: null,
        seriesId: null,
        seriesTitle: null,
        confidence: 'none',
        action: 'review',
        notes: [],
      })
    }
    const p = posts.get(slug)!
    p.sermonCount++
    if (r.website.videoId) p.withVideo++
    if (r.website.audioUrl) p.withAudio++
    if (r.status.startsWith('matched')) p.matchedInPayload++
    if (r.website.date) {
      if (!p.firstSeen || r.website.date < p.firstSeen) p.firstSeen = r.website.date
      if (!p.lastSeen || r.website.date > p.lastSeen) p.lastSeen = r.website.date
    }
  }
  console.log(`${posts.size} posts covering ${rows.length} sermons\n`)

  // ── overrides ──
  const overridesPath = resolve(ROOT, 'config/sermon-series-overrides.json')
  let overrides: { map?: Record<string, string | null>; titles?: Record<string, string> } = {}
  if (existsSync(overridesPath)) {
    overrides = JSON.parse(readFileSync(overridesPath, 'utf8'))
    console.log(`Overrides: ${overridesPath.replace(ROOT, '.')}`)
  }

  // ── existing series ──
  const { getPayload } = await import('payload')
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  const seriesRes = await payload.find({
    collection: 'series',
    limit: 500,
    depth: 0,
    overrideAccess: true,
    select: { title: true, year: true },
  })
  const series = seriesRes.docs.map((s) => ({
    id: String(s.id),
    title: s.title as string,
    year: (s.year as number | null) ?? null,
    key: normalize(s.title as string),
  }))
  console.log(`Payload series: ${series.length}\n`)

  // ── match ──
  for (const p of posts.values()) {
    // 1. explicit override wins over everything
    if (Object.prototype.hasOwnProperty.call(overrides.map ?? {}, p.postSlug)) {
      const target = overrides.map![p.postSlug]
      if (target === null) {
        p.action = 'link'
        p.seriesId = null
        p.confidence = 'override'
        p.notes.push('override: leave series unset')
        continue
      }
      const hit = series.find((s) => s.id === target || normalize(s.title) === normalize(target!))
      if (hit) {
        p.seriesId = hit.id
        p.seriesTitle = hit.title
        p.confidence = 'override'
        p.action = 'link'
        continue
      }
      p.seriesTitle = target
      p.confidence = 'override'
      p.action = 'create'
      p.notes.push('override names a series that does not exist yet — will be created')
      continue
    }

    const key = normalize(p.postTitle)

    // 2. exact title match, disambiguated by date when the name is reused
    const exact = series.filter((s) => s.key === key)
    if (exact.length === 1) {
      p.seriesId = exact[0]!.id
      p.seriesTitle = exact[0]!.title
      p.confidence = 'exact'
      p.action = 'link'
      continue
    }
    if (exact.length > 1) {
      const year = p.firstSeen ? Number(p.firstSeen.slice(0, 4)) : null
      const byYear = year ? exact.filter((s) => s.year === year) : []
      if (byYear.length === 1) {
        p.seriesId = byYear[0]!.id
        p.seriesTitle = byYear[0]!.title
        p.confidence = 'exact'
        p.action = 'link'
        p.notes.push(`name reused ${exact.length}× — resolved by year ${year}`)
      } else {
        p.action = 'review'
        p.notes.push(
          `name matches ${exact.length} series and the year did not separate them: ${exact.map((s) => `${s.title} (${s.year ?? '?'})`).join(', ')}`,
        )
      }
      continue
    }

    // 3. near-identical title
    const fuzzy = series.filter((s) => levenshtein(s.key, key) <= Math.max(2, Math.floor(key.length / 8)))
    if (fuzzy.length === 1) {
      p.seriesId = fuzzy[0]!.id
      p.seriesTitle = fuzzy[0]!.title
      p.confidence = 'fuzzy'
      p.action = 'review'
      p.notes.push(`title differs from "${fuzzy[0]!.title}" — confirm before linking`)
      continue
    }

    // 4. nothing. A post title is not necessarily a series name, so this is
    //    expected for most of the archive rather than an error.
    p.action = 'create'
    p.seriesTitle = (overrides.titles ?? {})[p.postSlug] ?? p.postTitle.replace(TITLE_NOISE, ' ').trim()
  }

  // Two posts asking to create series with the same name would produce two
  // indistinguishable entries in the admin, since `useAsTitle` is `title`.
  // Refuse rather than create them.
  const createByTitle = new Map<string, PostGroup[]>()
  for (const p of posts.values()) {
    if (p.action !== 'create' || !p.seriesTitle) continue
    const k = normalize(p.seriesTitle)
    createByTitle.set(k, [...(createByTitle.get(k) ?? []), p])
  }
  for (const group of createByTitle.values()) {
    if (group.length < 2) continue
    for (const p of group) {
      p.action = 'review'
      p.notes.push(
        `would create a series called "${p.seriesTitle}" alongside ` +
          `${group.filter((g) => g !== p).map((g) => g.postSlug).join(', ')} — ` +
          'give each a distinct title in overrides.titles',
      )
    }
  }

  const all = [...posts.values()].sort((a, b) => (b.firstSeen ?? '').localeCompare(a.firstSeen ?? ''))
  const link = all.filter((p) => p.action === 'link')
  const create = all.filter((p) => p.action === 'create')
  const review = all.filter((p) => p.action === 'review')

  // ── duplicate post titles on the website itself ──
  const titleCounts = new Map<string, PostGroup[]>()
  for (const p of all) {
    const k = normalize(p.postTitle)
    titleCounts.set(k, [...(titleCounts.get(k) ?? []), p])
  }
  const dupTitles = [...titleCounts.values()].filter((g) => g.length > 1)

  // ── write map ──
  const mapPath = resolve(ROOT, 'config/sermon-series-map.json')
  mkdirSync(dirname(mapPath), { recursive: true })
  writeFileSync(
    mapPath,
    JSON.stringify(
      {
        _instructions: [
          'Generated — overwritten on every run. Record decisions in',
          'config/sermon-series-overrides.json instead, keyed by postSlug.',
          '  link   — use seriesId',
          '  create — make a series titled seriesTitle',
          '  review — the importer refuses to run while any remain',
        ],
        generatedAt: new Date().toISOString(),
        sourceReport: reportPath.replace(ROOT, '.'),
        posts: all.map((p) => ({
          postSlug: p.postSlug,
          postTitle: p.postTitle,
          action: p.action,
          seriesId: p.seriesId,
          seriesTitle: p.seriesTitle,
          confidence: p.confidence,
          sermonCount: p.sermonCount,
          year: p.firstSeen ? Number(p.firstSeen.slice(0, 4)) : null,
          activeBetween: [p.firstSeen, p.lastSeen],
          notes: p.notes,
        })),
      },
      null,
      2,
    ),
  )

  // ── write report ──
  const L: string[] = []
  L.push('# Sermon series — mapping for review')
  L.push('')
  L.push(`Generated ${new Date().toISOString()} · **read-only, nothing written to Payload**`)
  L.push('')
  L.push('| | Count |')
  L.push('|---|---:|')
  L.push(`| Website posts | ${all.length} |`)
  L.push(`| Sermons covered | ${rows.length} |`)
  L.push(`| Existing series in Payload | ${series.length} |`)
  L.push(`| Matched to an existing series | ${link.length} |`)
  L.push(`| Need a new series | ${create.length} |`)
  L.push(`| Need your eyes | ${review.length} |`)
  L.push('')
  L.push('A post title is not the same thing as a series name — the post')
  L.push('"Turn it to praise" holds the series "Story of The Psalms". So most posts')
  L.push('landing in `create` is expected, not a failure. Anything that should point')
  L.push('at an existing series needs a line in the overrides file.')
  L.push('')

  if (review.length > 0) {
    L.push('## Decide these')
    L.push('')
    L.push('| Post | Guess | Why | Sermons |')
    L.push('|---|---|---|---:|')
    for (const p of review) {
      L.push(`| [${p.postTitle}](https://www.hif.vn/${p.postSlug}/) | ${p.seriesTitle ?? '—'} | ${p.notes.join('; ')} | ${p.sermonCount} |`)
    }
    L.push('')
  }

  if (dupTitles.length > 0) {
    L.push('## Post titles used more than once')
    L.push('')
    L.push('Separate series that happen to share a name. They must not be merged.')
    L.push('')
    for (const g of dupTitles) {
      L.push(`- **${g[0]!.postTitle}**`)
      for (const p of g) {
        const yr = p.firstSeen ? p.firstSeen.slice(0, 4) : 'year unknown'
        L.push(`  - \`${p.postSlug}\` — ${yr}, ${p.sermonCount} sermons`)
      }
    }
    L.push('')
  }

  L.push('## All posts')
  L.push('')
  L.push('| Post | Action | Series | Sermons | Video | Audio | In Payload | Dates |')
  L.push('|---|---|---|---:|---:|---:|---:|---|')
  for (const p of all) {
    const span =
      p.firstSeen && p.lastSeen
        ? p.firstSeen.slice(0, 4) === p.lastSeen.slice(0, 4)
          ? p.firstSeen.slice(0, 4)
          : `${p.firstSeen.slice(0, 4)}–${p.lastSeen.slice(0, 4)}`
        : '—'
    L.push(
      `| [${p.postTitle}](https://www.hif.vn/${p.postSlug}/) | ${p.action} | ${p.seriesTitle ?? '—'} | ` +
        `${p.sermonCount} | ${p.withVideo} | ${p.withAudio} | ${p.matchedInPayload} | ${span} |`,
    )
  }
  L.push('')

  const mdPath = resolve(ROOT, `reports/series-mapping-${new Date().toISOString().slice(0, 10)}.md`)
  writeFileSync(mdPath, L.join('\n'))

  console.log(`${all.length} posts · ${link.length} matched · ${create.length} new · ${review.length} to decide`)
  console.log(`\nReview  ${mdPath.replace(ROOT, '.')}`)
  console.log(`Edit    ${overridesPath.replace(ROOT, '.')}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
