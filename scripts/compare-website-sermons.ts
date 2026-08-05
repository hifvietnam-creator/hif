/**
 * scripts/compare-website-sermons.ts
 *
 * READ-ONLY. Compares every sermon published on hif.vn against the Sermons
 * collection in Payload. Never writes to Payload.
 *
 * The website is the only place the resource links live (slides, discussion
 * guides, and for the oldest sermons the MP3 audio). Payload knows the videos
 * but not the files. Neither side is complete; this establishes what each is
 * missing.
 *
 * ── Join keys ────────────────────────────────────────────────────────────────
 *   video sermons  →  YouTube ID.  Site stores youtu.be/<id>, Payload stores
 *                     youtube.com/watch?v=<id>. Both normalise to the bare id.
 *   audio sermons  →  MP3 URL, matched against Sermons.audioURL.
 *
 * ── Four page formats exist ──────────────────────────────────────────────────
 *   A  2025+       dated entries, YouTube + OneDrive
 *   B  ~2022–2024  same layout, YEAR MISSING from entry dates
 *   C  2019–2021   YouTube + "Sermon PowerPoint Here", year missing
 *   D  pre-2018    MP3 only, no video at all
 *
 * Missing years are inferred; every entry records whether its date was explicit
 * or inferred so the report can be trusted accordingly.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/compare-website-sermons.ts --all
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/compare-website-sermons.ts --slug=turn-it-to-praise
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/compare-website-sermons.ts --all --no-db
 *
 * Requires .env: DATABASE_URL, PAYLOAD_SECRET
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

const SITE = 'https://www.hif.vn'
const SERMON_CATEGORY_ID = 51
const UA = 'HIF-Dashboard/1.0 (sermon reconciliation, read-only)'

/** Pasted identically onto every recent entry — the archive folder, not a file. */
const GENERIC_FOLDER_MARKER = '1drv.ms/b/s!'

/** Slugs in the site chrome that must never be mistaken for a post. */
const NON_POST_SLUGS = new Set([
  'about', 'history', 'hif-purpose-values', 'beliefs', 'baptism', 'members',
  'hanoi', 'ecopark', 'kq', 'aftershock', 'connect', 'alpha', 'prayer',
  'worship', 'citypartners', 'spotlight', 'online', 'sermons', 'news',
  'stories', 'resources', 'calendar', 'booking', 'serve', 'give', 'category',
  'author', 'tag', 'wp-content', 'wp-json', 'agency', 'page', 'feed',
])

// ── Types ─────────────────────────────────────────────────────────────────────

type Era = 'A' | 'B' | 'C' | 'D'

interface WebsiteSermon {
  postSlug: string
  seriesTitle: string
  era: Era
  index: number
  title: string | null
  speaker: string | null
  campus: string | null
  dateText: string | null
  date: string | null
  dateSource: 'explicit' | 'audio-path' | 'inferred' | 'unknown'
  videoId: string | null
  audioUrl: string | null
  slidesUrl: string | null
  discussionUrl: string | null
  otherLinks: Array<{ label: string; url: string }>
  unlinkedLabels: string[]
  notes: string[]
}

interface ComparisonRow {
  website: WebsiteSermon
  status: 'matched-video' | 'matched-audio' | 'missing-from-payload' | 'unmatchable'
  payloadId?: string | number
  payloadTitle?: string
  payloadDate?: string
  proposed: Array<{ field: string; from: string | null; to: string }>
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'",
  '&#39;': "'", '&nbsp;': ' ', '&#8217;': '’', '&#8216;': '‘',
  '&#8220;': '“', '&#8221;': '”', '&#8211;': '–', '&#8212;': '—', '&#8230;': '…',
}

function decodeEntities(s: string): string {
  let out = s
  for (const [e, c] of Object.entries(ENTITIES)) out = out.split(e).join(c)
  return out.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
}

const stripTags = (s: string) => s.replace(/<[^>]*>/g, ' ')

function clean(s: string): string {
  return decodeEntities(stripTags(s)).replace(/ /g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Dates ─────────────────────────────────────────────────────────────────────

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const MONTH_ALIASES: Record<string, number> = {}
MONTHS_FULL.forEach((m, i) => {
  MONTH_ALIASES[m.toLowerCase()] = i
  MONTH_ALIASES[m.slice(0, 3).toLowerCase()] = i
})
MONTH_ALIASES['sept'] = 8

/**
 * Matches "August 02, 2026", "Nov 15, 2015", "Dec 27th", "June 14", "Apr 23".
 * The year group is optional — most of the archive omits it.
 */
const DATE_RE = new RegExp(
  '\\b(' + MONTHS_FULL.join('|') + '|' +
  MONTHS_FULL.map((m) => m.slice(0, 3)).join('|') + '|Sept)\\.?' +
  '\\s+(\\d{1,2})(?:st|nd|rd|th)?' +
  '(?:\\s*,?\\s*(\\d{4}))?',
  'gi',
)

const pad = (n: number) => String(n).padStart(2, '0')

// ── Resource label classification ─────────────────────────────────────────────

type LinkKind = 'slides' | 'discussion' | 'bible-study' | 'audio' | 'ignored' | 'other'

/**
 * Older posts write `Download Sermon PowerPoint File <a>Here</a>` — the meaning
 * sits in the run-up text, and the anchor itself says only "Here". So the label
 * is classified on `context` (the text between the previous link and this one)
 * combined with the anchor's own text. Anchor text alone is not enough: "Here"
 * appeared 404 times in the first full run and classified nothing.
 */
function classifyLabel(label: string, href: string, context: string): LinkKind {
  const l = `${context} ${label}`.toLowerCase()
  const h = href.toLowerCase()

  if (/\.mp3(\?|$)/.test(h) || /play\s*mp3/.test(l)) return 'audio'

  // Out of scope by decision — no field exists for these.
  if (/40\s*days|prayer\s*booklet|kids sermon|youth sermon|lament psalms|devotional/.test(l)) {
    return 'ignored'
  }
  if (/bible study/.test(l)) return 'bible-study'
  if (/discussion|group guide/.test(l)) return 'discussion'
  if (/sermon slides|sermon note|powerpoint|\bppt\b|\bslides\b|sermon file/.test(l)) return 'slides'
  return 'other'
}

/**
 * Old files live in year-foldered paths: `/MP3 Sermons/2015/Series/…`. That
 * folder is hard evidence of the real year, which the page text never gives.
 */
function yearFromUrl(url: string | null | undefined): number | null {
  if (!url) return null
  let decoded = url
  try { decoded = decodeURIComponent(url) } catch { /* malformed escape */ }
  const m = decoded.match(/\/((?:19|20)\d{2})\//)
  if (!m) return null
  const y = Number(m[1])
  return y >= 1995 && y <= new Date().getFullYear() + 1 ? y : null
}

function yearFromAnyUrl(urls: Array<string | null | undefined>): number | null {
  for (const u of urls) {
    const y = yearFromUrl(u)
    if (y !== null) return y
  }
  return null
}

const isFileHost = (href: string) =>
  /1drv\.ms|sharepoint|onedrive|docs\.google|drive\.google|dropbox|\.pdf|\.pptx?|\.docx?|\.mp3/i.test(href)

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

interface Post {
  slug: string
  title: string
  content: string
  publishedAt: string
}

/**
 * The site sits behind a cache that has been observed to ignore query strings
 * on /wp-json/wp/v2/posts and serve a stale body. So the REST result is only
 * trusted when the slug it returns is the slug that was asked for; otherwise
 * we fall back to scraping the post's own permalink.
 */
async function fetchPost(slug: string): Promise<Post> {
  try {
    const body = await get(`${SITE}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}`)
    const json = JSON.parse(body) as Array<{
      slug: string
      title: { rendered: string }
      content: { rendered: string }
      date: string
    }>
    if (Array.isArray(json) && json[0] && json[0].slug === slug) {
      return {
        slug,
        title: clean(json[0].title.rendered),
        content: json[0].content.rendered,
        publishedAt: json[0].date,
      }
    }
    console.warn(`  ! REST returned "${json?.[0]?.slug ?? 'nothing'}" for "${slug}" — using permalink`)
  } catch (err) {
    console.warn(`  ! REST failed for "${slug}" (${(err as Error).message}) — using permalink`)
  }

  const html = await get(`${SITE}/${slug}/`)
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i)
  const dateMatch =
    html.match(/"datePublished"\s*:\s*"([^"]+)"/) ??
    html.match(/<time[^>]+datetime="([^"]+)"/)
  return {
    slug,
    title: clean(titleMatch?.[1] ?? slug).replace(/\s*–\s*Hanoi International Fellowship$/, ''),
    content: html,
    publishedAt: dateMatch?.[1] ?? '',
  }
}

/** Walks the category archive, whose paths are cache-safe, collecting slugs. */
async function listSermonSlugs(): Promise<string[]> {
  const slugs: string[] = []
  const seen = new Set<string>()

  for (let page = 1; page <= 40; page++) {
    const url = page === 1 ? `${SITE}/category/sermons/` : `${SITE}/category/sermons/page/${page}/`
    let html: string
    try {
      html = await get(url)
    } catch {
      break
    }

    const before = slugs.length
    // Entry links carry a title attribute; nav links in this theme do not.
    const re = /<a\b[^>]*href="https?:\/\/(?:www\.)?hif\.vn\/([a-z0-9][a-z0-9-]*)\/?"[^>]*\stitle="/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      const slug = m[1]!.toLowerCase()
      if (NON_POST_SLUGS.has(slug) || /^\d+$/.test(slug) || seen.has(slug)) continue
      seen.add(slug)
      slugs.push(slug)
    }
    if (slugs.length === before) break
  }
  return slugs
}

async function fetchCategoryCount(): Promise<number | null> {
  try {
    const body = await get(`${SITE}/wp-json/wp/v2/categories?slug=sermons`)
    const json = JSON.parse(body) as Array<{ id: number; count: number }>
    const cat = json.find((c) => c.id === SERMON_CATEGORY_ID) ?? json[0]
    return cat?.count ?? null
  } catch {
    return null
  }
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function detectEra(content: string): Era {
  const hasVideo = /youtu\.be|youtube\.com/i.test(content)
  const hasYear = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*,\s*\d{4}/i.test(content)
  const hasOneDrive = /1drv\.ms|sharepoint/i.test(content)

  if (!hasVideo) return 'D'
  if (hasYear && hasOneDrive) return 'A'
  if (hasOneDrive) return 'B'
  return 'C'
}

/**
 * Text that ends the PREVIOUS sermon's resource line. Everything after the last
 * such marker is this sermon's own heading. Cleaned text is searched, never raw
 * HTML — slicing raw HTML was what leaked `<path>` fragments into speaker names.
 */
const HEADING_CUT_RE =
  /(save link as[”"'’]?|devotional guide|discussion group guide|download sermon slides|sermon slides|prayer booklet here here|prayer booklet here|study guide for this week here|powerpoint file here|powerpoint here|sermon file|\bhere\b|youtu\.be\/[A-Za-z0-9_-]{11}|watch\?v=[A-Za-z0-9_-]{11})/gi

/**
 * Real block-level opening tags. `\b` after the tag name is what keeps `<p`
 * from matching `<path>` in inline SVG — the bug that leaked markup like
 * `ntainer"> PLAY MP3 by …` into speaker names on the first full run.
 */
const BLOCK_TAG_RE = /<(?:p|div|br|h[1-6]|li|td)\b[^>]*>/gi

function extractHeading(beforeRaw: string): { title: string | null; speaker: string | null; campus: string | null } {
  // Step 1: start from the last real block boundary in the raw HTML.
  let blockAt = 0
  BLOCK_TAG_RE.lastIndex = 0
  let bm: RegExpExecArray | null
  while ((bm = BLOCK_TAG_RE.exec(beforeRaw)) !== null) blockAt = bm.index + bm[0].length
  const text = clean(beforeRaw.slice(blockAt))

  // Step 2: drop anything up to the end of the previous entry's resource line.
  let cutAt = 0
  HEADING_CUT_RE.lastIndex = 0
  let cm: RegExpExecArray | null
  while ((cm = HEADING_CUT_RE.exec(text)) !== null) cutAt = cm.index + cm[0].length
  let heading = text.slice(cutAt).trim()

  // Step 3: the video shortcode leaves a JSON tail (…"controls":"yes"}]).
  // Nothing after the last brace or quote belongs to it.
  const jsonEnd = Math.max(heading.lastIndexOf('}'), heading.lastIndexOf('"'))
  if (jsonEnd >= 0) heading = heading.slice(jsonEnd + 1)

  if (heading.length > 220) heading = heading.slice(-220)
  heading = heading.replace(/^[\s\]\[)(|@–—:,-]+/, '').replace(/[\s|@–—:,-]+$/, '')

  const parts = heading
    .split(/\s*\|\s*|\s+@\s*|\s+[–—]\s+|\s+-\s+/)
    .map((p) => p.trim())
    .filter(Boolean)

  const campusRe =
    /^(my\s?dinh|west\s?lake(\s+fellowship)?|hif(\s+online)?\s+service|live sunday service|joint[^|]*|forevermark[^|]*|online service)$/i
  const speakerLead = /^(sermon\s+by|play\s*mp3\s+by|testimony[^|]*by|by)\s+/i
  const titleRe = /^(pastor|rev\.?|dr\.?|mr\.?|mrs\.?|ms\.?)\s+/i

  let title: string | null = null
  let speaker: string | null = null
  let campus: string | null = null

  for (const p of parts) {
    if (campusRe.test(p)) { campus ??= p; continue }
    if (speakerLead.test(p)) { speaker ??= p.replace(speakerLead, '').trim(); continue }
    if (titleRe.test(p) && !speaker) { speaker = p; continue }
    title ??= p
  }

  // "PLAY MP3 by Pastor X" can land in `title` when no pipe separated it.
  if (!speaker && title && speakerLead.test(title)) {
    speaker = title.replace(speakerLead, '').trim()
    title = null
  }
  if (title && /^(play\s*mp3|sermon|testimony)$/i.test(title)) title = null

  return { title: title || null, speaker: speaker || null, campus: campus || null }
}

function parsePost(post: Post, opts: { trustPublishDate: boolean }): WebsiteSermon[] {
  const html = post.content
  const era = detectEra(html)

  // ── locate every date, which is what delimits one sermon from the next ──
  DATE_RE.lastIndex = 0
  const anchors: Array<{
    start: number; end: number; month: number; day: number; year: number | null; text: string
  }> = []
  let m: RegExpExecArray | null
  while ((m = DATE_RE.exec(html)) !== null) {
    const month = MONTH_ALIASES[m[1]!.toLowerCase().replace('.', '')]
    if (month === undefined) continue
    const day = Number(m[2])
    if (day < 1 || day > 31) continue
    anchors.push({
      start: m.index,
      end: m.index + m[0].length,
      month,
      day,
      year: m[3] ? Number(m[3]) : null,
      text: m[0],
    })
  }

  // ── pass 1: pull each entry's content out of its region ──
  interface Raw {
    videoId: string | null
    audioUrl: string | null
    slidesUrl: string | null
    discussionUrl: string | null
    otherLinks: Array<{ label: string; url: string }>
    unlinkedLabels: string[]
    notes: string[]
    heading: ReturnType<typeof extractHeading>
  }

  /** Anchors with the run-up text that gives each one its meaning. */
  function scanLinks(segment: string) {
    const out: Array<{ href: string; label: string; kind: LinkKind }> = []
    const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    let prevEnd = 0
    let m2: RegExpExecArray | null
    while ((m2 = re.exec(segment)) !== null) {
      const href = decodeEntities(m2[1]!.trim())
      const label = clean(m2[2]!)
      const context = clean(segment.slice(prevEnd, m2.index)).slice(-90)
      prevEnd = m2.index + m2[0].length
      out.push({ href, label, kind: classifyLabel(label, href, context) })
    }
    return out
  }

  const raws: Raw[] = anchors.map((a, i) => {
    const regionStart = i === 0 ? 0 : anchors[i - 1]!.end
    const regionEnd = i === anchors.length - 1 ? html.length : anchors[i + 1]!.start
    const before = html.slice(regionStart, a.start)
    const after = html.slice(a.end, regionEnd)
    const notes: string[] = []

    const ids = [
      ...[...before.matchAll(/youtu\.be[\\/]+([A-Za-z0-9_-]{11})/g)].map((x) => x[1]!),
      ...[...before.matchAll(/youtube\.com[\\/]+(?:watch\?v=|embed[\\/]+)([A-Za-z0-9_-]{11})/g)].map((x) => x[1]!),
    ]
    const videoId = ids.length > 0 ? ids[ids.length - 1]! : null
    if (ids.length > 1) notes.push(`${ids.length} videos in this entry's region; used the last`)

    let audioUrl: string | null = null
    let slidesUrl: string | null = null
    let discussionUrl: string | null = null
    const otherLinks: Array<{ label: string; url: string }> = []

    // The MP3 player sits BEFORE its caption, so audio is taken from `before`.
    for (const l of scanLinks(before)) {
      if (l.kind === 'audio') { audioUrl ??= l.href; }
    }
    for (const l of scanLinks(after)) {
      if (l.href.includes(GENERIC_FOLDER_MARKER)) {
        if (!notes.includes('generic archive-folder link (ignored)')) {
          notes.push('generic archive-folder link (ignored)')
        }
        continue
      }
      if (l.kind === 'audio') { audioUrl ??= l.href; continue }
      if (l.kind === 'ignored') continue
      if (!isFileHost(l.href)) continue
      if (l.kind === 'slides') slidesUrl ??= l.href
      else if (l.kind === 'discussion') discussionUrl ??= l.href
      else otherLinks.push({ label: `${l.kind}: ${l.label || '(no label)'}`, url: l.href })
    }

    const afterText = clean(after)
    const unlinkedLabels: string[] = []
    if (!slidesUrl && /sermon slides|sermon powerpoint|powerpoint file/i.test(afterText)) {
      unlinkedLabels.push('slides')
    }
    if (!discussionUrl && /discussion group guide/i.test(afterText)) {
      unlinkedLabels.push('discussion guide')
    }
    if (/no powerpoint|no mp3|no sermon for this|coming soon|coming later|not available/i.test(afterText)) {
      notes.push('page states the resource is unavailable')
    }
    if (!videoId && !audioUrl) notes.push('no video and no audio — cannot be matched')

    return {
      videoId, audioUrl, slidesUrl, discussionUrl, otherLinks, unlinkedLabels, notes,
      heading: extractHeading(before),
    }
  })

  // ── pass 2: resolve years ──
  // Hard evidence first: a year printed in the text, or one embedded in the
  // MP3 path (`/MP3 Sermons/2015/…`). Only where neither exists do we infer.
  const publishDate = post.publishedAt ? new Date(post.publishedAt) : null
  const publishYear = publishDate ? publishDate.getFullYear() : new Date().getFullYear()

  const hard: Array<number | null> = anchors.map(
    (a, i) =>
      a.year ??
      yearFromAnyUrl([
        raws[i]!.audioUrl,
        raws[i]!.slidesUrl,
        raws[i]!.discussionUrl,
        ...raws[i]!.otherLinks.map((o) => o.url),
      ]),
  )
  const hardIdxs = hard.map((y, i) => (y !== null ? i : -1)).filter((i) => i >= 0)
  const resolved: Array<number | null> = new Array(anchors.length).fill(null)

  if (anchors.length > 0) {
    let seedIdx: number | null = null
    let seedYear = publishYear

    if (hardIdxs.length > 0) {
      seedIdx = hardIdxs[hardIdxs.length - 1]! // lowest in the document = oldest
      seedYear = hard[seedIdx]!
    } else if (opts.trustPublishDate && publishDate) {
      // Entries run newest-first, so the last is the oldest sermon, and a series
      // is normally posted around its start. Pick whichever candidate year puts
      // that sermon closest to the publish date — but only accept it if it lands
      // within 90 days. Beyond that the publish date is telling us nothing, and
      // inventing a year is worse than admitting we don't know.
      const a = anchors[anchors.length - 1]!
      const cands = [publishYear - 1, publishYear, publishYear + 1]
        .map((y) => ({ y, delta: Math.abs(Date.UTC(y, a.month, a.day) - publishDate.getTime()) }))
        .sort((p, q) => p.delta - q.delta)
      const best = cands[0]!
      if (best.delta <= 90 * 86_400_000) {
        seedIdx = anchors.length - 1
        seedYear = best.y
      }
    }

    if (seedIdx === null) {
      // No evidence anywhere in this post. Leave every year unresolved.
      return anchors.map((a, i) => {
        const r = raws[i]!
        return {
          postSlug: post.slug,
          seriesTitle: post.title,
          era,
          index: i,
          title: r.heading.title,
          speaker: r.heading.speaker,
          campus: r.heading.campus,
          dateText: a.text,
          date: null,
          dateSource: 'unknown' as const,
          videoId: r.videoId,
          audioUrl: r.audioUrl,
          slidesUrl: r.slidesUrl,
          discussionUrl: r.discussionUrl,
          otherLinks: r.otherLinks,
          unlinkedLabels: r.unlinkedLabels,
          notes: [...r.notes, 'YEAR UNKNOWN: no year on the page, in any file path, or from the publish date'],
        }
      })
    }
    resolved[seedIdx] = seedYear

    // Upward through the document = forward in time.
    let year = seedYear
    let prevMonth = anchors[seedIdx]!.month
    for (let i = seedIdx - 1; i >= 0; i--) {
      if (hard[i] !== null) year = hard[i]!
      else if (anchors[i]!.month < prevMonth) year += 1
      resolved[i] = year
      prevMonth = anchors[i]!.month
    }
    // Downward through the document = backward in time.
    year = seedYear
    prevMonth = anchors[seedIdx]!.month
    for (let i = seedIdx + 1; i < anchors.length; i++) {
      if (hard[i] !== null) year = hard[i]!
      else if (anchors[i]!.month > prevMonth) year -= 1
      resolved[i] = year
      prevMonth = anchors[i]!.month
    }
  }

  // ── pass 3: assemble ──
  const sermons: WebsiteSermon[] = anchors.map((a, i) => {
    const r = raws[i]!
    const year = resolved[i] ?? null
    const source: WebsiteSermon['dateSource'] =
      a.year !== null ? 'explicit'
      : hard[i] !== null ? 'audio-path'
      : year ? 'inferred'
      : 'unknown'

    return {
      postSlug: post.slug,
      seriesTitle: post.title,
      era,
      index: i,
      title: r.heading.title,
      speaker: r.heading.speaker,
      campus: r.heading.campus,
      dateText: a.text,
      date: year ? `${year}-${pad(a.month + 1)}-${pad(a.day)}` : null,
      dateSource: source,
      videoId: r.videoId,
      audioUrl: r.audioUrl,
      slidesUrl: r.slidesUrl,
      discussionUrl: r.discussionUrl,
      otherLinks: r.otherLinks,
      unlinkedLabels: r.unlinkedLabels,
      notes: r.notes,
    }
  })

  // A real series does not run for years. A long span means the year inference
  // drifted, so say so rather than letting it pass silently.
  const spanDates = sermons.map((s) => s.date).filter(Boolean).sort() as string[]
  if (spanDates.length > 1) {
    const days =
      (Date.parse(spanDates[spanDates.length - 1]!) - Date.parse(spanDates[0]!)) / 86_400_000
    if (days > 400) {
      // The span check has just proved the year inference failed for this post
      // — most likely a stray date in prose broke the newest-first ordering the
      // month-wrap logic depends on. Publishing those years anyway would spread
      // the error, so inferred dates are withdrawn while explicit and
      // audio-path ones (which are evidence, not inference) are kept.
      // Nothing is lost operationally: the join key is the video, not the date.
      for (const s of sermons) {
        s.notes.push(`IMPLAUSIBLE SPAN: series dates cover ${Math.round(days)} days — inference withdrawn`)
        if (s.dateSource === 'inferred') {
          s.date = null
          s.dateSource = 'unknown'
        }
      }
    }
  }

  // Duplicate resource links inside one post are usually a copy-paste slip.
  const bySlides = new Map<string, number[]>()
  sermons.forEach((s, i) => {
    if (!s.slidesUrl) return
    bySlides.set(s.slidesUrl, [...(bySlides.get(s.slidesUrl) ?? []), i])
  })
  for (const [url, idxs] of bySlides) {
    if (idxs.length < 2) continue
    const who = idxs.map((i) => sermons[i]!.date ?? `#${i}`).join(', ')
    for (const i of idxs) sermons[i]!.notes.push(`slides link shared with ${who} (${url})`)
  }

  return sermons
}

// ── Payload ───────────────────────────────────────────────────────────────────

function extractVideoId(url: string | null | undefined): string | null {
  if (!url) return null
  const m =
    url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ??
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/) ??
    url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/)
  return m ? m[1]! : null
}

// ── Report ────────────────────────────────────────────────────────────────────

function buildMarkdown(
  rows: ComparisonRow[],
  payloadTotal: number,
  payloadUnseen: Array<Record<string, unknown>>,
  dbChecked: boolean,
): string {
  const L: string[] = []
  const n = rows.length
  const pct = (x: number) => (n === 0 ? '0' : ((x / n) * 100).toFixed(0))

  L.push('# Website vs Payload — full sermon reconciliation')
  L.push('')
  L.push(`Generated ${new Date().toISOString()}`)
  L.push('')
  L.push('**Read-only. Nothing in this run wrote to Payload.**')
  L.push('')

  const byEra = (e: Era) => rows.filter((r) => r.website.era === e)
  const matched = rows.filter((r) => r.status.startsWith('matched'))
  const missing = rows.filter((r) => r.status === 'missing-from-payload')
  const unmatchable = rows.filter((r) => r.status === 'unmatchable')
  const inferred = rows.filter((r) => r.website.dateSource === 'inferred')
  const withSlides = rows.filter((r) => r.website.slidesUrl)
  const withDisc = rows.filter((r) => r.website.discussionUrl)
  const withAudio = rows.filter((r) => r.website.audioUrl)

  L.push('## Summary')
  L.push('')
  L.push('| | Count | % |')
  L.push('|---|---:|---:|')
  L.push(`| Sermons found on the website | ${n} | 100 |`)
  if (dbChecked) {
    L.push(`| Matched to a Payload record | ${matched.length} | ${pct(matched.length)} |`)
    L.push(`| On the website, absent from Payload | ${missing.length} | ${pct(missing.length)} |`)
    L.push(`| Unmatchable (no video, no audio) | ${unmatchable.length} | ${pct(unmatchable.length)} |`)
    L.push(`| Payload sermons not found on the website | ${payloadUnseen.length} | — |`)
    L.push(`| Payload sermons total | ${payloadTotal} | — |`)
  }
  L.push(`| Carrying a slides link | ${withSlides.length} | ${pct(withSlides.length)} |`)
  L.push(`| Carrying a discussion guide | ${withDisc.length} | ${pct(withDisc.length)} |`)
  L.push(`| Carrying an MP3 | ${withAudio.length} | ${pct(withAudio.length)} |`)
  L.push('')

  L.push('### Where each date came from')
  L.push('')
  L.push('| Source | Count | % |')
  L.push('|---|---:|---:|')
  for (const src of ['explicit', 'audio-path', 'inferred', 'unknown'] as const) {
    const c = rows.filter((r) => r.website.dateSource === src).length
    if (c > 0) L.push(`| ${src} | ${c} | ${pct(c)} |`)
  }
  L.push('')
  L.push('`explicit` = printed on the page. `audio-path` = read from the year folder')
  L.push('in the MP3 URL. `inferred` = derived from publish date and month sequence,')
  L.push('and is the only category that should be treated as a guess.')
  L.push('')

  const unknownSlugs = [
    ...new Set(rows.filter((r) => r.website.dateSource === 'unknown').map((r) => r.website.postSlug)),
  ]
  if (unknownSlugs.length > 0) {
    L.push('### Series with no recoverable year')
    L.push('')
    L.push('No year on the page, none in any file path, and a bulk-migration publish')
    L.push('date that carries no information. These are left dated `null` rather than')
    L.push('guessed. Someone who remembers the era could date them by hand.')
    L.push('')
    for (const slug of unknownSlugs) {
      const g = rows.filter((r) => r.website.postSlug === slug)
      L.push(`- **${g[0]!.website.seriesTitle}** (${SITE}/${slug}/) — ${g.length} sermons`)
    }
    L.push('')
  }

  const badSpan = [
    ...new Set(
      rows.filter((r) => r.website.notes.some((n) => n.startsWith('IMPLAUSIBLE SPAN')))
        .map((r) => r.website.postSlug),
    ),
  ]
  if (badSpan.length > 0) {
    L.push('### Series whose year inference was withdrawn')
    L.push('')
    L.push('Inferred dates spanned more than 400 days, which no real series does — proof')
    L.push('the inference failed. Guessed years were dropped; any explicit or file-path')
    L.push('years were kept. Matching is unaffected, since the join key is the video.')
    L.push('')
    for (const slug of badSpan) {
      const g = rows.filter((r) => r.website.postSlug === slug)
      const d = g.map((r) => r.website.date).filter(Boolean).sort() as string[]
      const span = d.length ? `${d[0]} → ${d[d.length - 1]}` : 'all dates withdrawn'
      L.push(`- **${g[0]!.website.seriesTitle}** (${SITE}/${slug}/) — ${span}, ${g.length} sermons`)
    }
    L.push('')
  }

  L.push('## By era')
  L.push('')
  L.push('| Era | Sermons | Matched | Missing | Slides | Discussion | MP3 | Inferred dates |')
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|')
  for (const e of ['A', 'B', 'C', 'D'] as Era[]) {
    const g = byEra(e)
    if (g.length === 0) continue
    L.push(
      `| ${e} | ${g.length} | ${g.filter((r) => r.status.startsWith('matched')).length} | ` +
        `${g.filter((r) => r.status === 'missing-from-payload').length} | ` +
        `${g.filter((r) => r.website.slidesUrl).length} | ` +
        `${g.filter((r) => r.website.discussionUrl).length} | ` +
        `${g.filter((r) => r.website.audioUrl).length} | ` +
        `${g.filter((r) => r.website.dateSource === 'inferred').length} |`,
    )
  }
  L.push('')

  L.push('## By series')
  L.push('')
  L.push('| Series | Era | Sermons | Dates | Matched | Slides | Discussion | MP3 | Flags |')
  L.push('|---|---|---:|---|---:|---:|---:|---:|---:|')
  const bySeries = new Map<string, ComparisonRow[]>()
  for (const r of rows) {
    bySeries.set(r.website.postSlug, [...(bySeries.get(r.website.postSlug) ?? []), r])
  }
  for (const [slug, g] of bySeries) {
    const dates = g.map((r) => r.website.date).filter(Boolean).sort() as string[]
    const span = dates.length ? `${dates[0]} → ${dates[dates.length - 1]}` : '—'
    L.push(
      `| [${g[0]!.website.seriesTitle}](${SITE}/${slug}/) | ${g[0]!.website.era} | ${g.length} | ${span} | ` +
        `${g.filter((r) => r.status.startsWith('matched')).length} | ` +
        `${g.filter((r) => r.website.slidesUrl).length} | ` +
        `${g.filter((r) => r.website.discussionUrl).length} | ` +
        `${g.filter((r) => r.website.audioUrl).length} | ` +
        `${g.reduce((acc, r) => acc + r.website.notes.length, 0)} |`,
    )
  }
  L.push('')

  if (unmatchable.length > 0) {
    L.push('## Unmatchable sermons')
    L.push('')
    L.push('No video and no audio, so there is no key to join on. These would have to be')
    L.push('created from the website rather than matched.')
    L.push('')
    for (const r of unmatchable.slice(0, 60)) {
      L.push(`- ${r.website.date ?? '?'} — ${r.website.seriesTitle} — ${r.website.speaker ?? r.website.title ?? '?'}`)
    }
    if (unmatchable.length > 60) L.push(`- …and ${unmatchable.length - 60} more (see JSON)`)
    L.push('')
  }

  const otherLabels = new Map<string, number>()
  for (const r of rows) {
    for (const o of r.website.otherLinks) {
      otherLabels.set(o.label, (otherLabels.get(o.label) ?? 0) + 1)
    }
  }
  if (otherLabels.size > 0) {
    L.push('## Unclassified link labels')
    L.push('')
    L.push('Links found on the pages that map to no field. Confirm each is genuinely out of scope.')
    L.push('')
    L.push('| Label | Count |')
    L.push('|---|---:|')
    for (const [label, count] of [...otherLabels].sort((a, b) => b[1] - a[1]).slice(0, 40)) {
      L.push(`| ${label} | ${count} |`)
    }
    L.push('')
  }

  if (dbChecked && payloadUnseen.length > 0) {
    L.push('## In Payload, not found on the website')
    L.push('')
    for (const p of payloadUnseen.slice(0, 60)) {
      L.push(`- ${p.date ?? '?'} — ${p.title} (\`${p.videoId ?? 'no video'}\`)`)
    }
    if (payloadUnseen.length > 60) L.push(`- …and ${payloadUnseen.length - 60} more (see JSON)`)
    L.push('')
  }

  if (dbChecked) {
    const proposals = rows.filter((r) => r.proposed.length > 0)
    L.push('## Proposed field changes (NOT applied)')
    L.push('')
    L.push(`${proposals.length} matched sermons would gain at least one field.`)
    L.push('')
    L.push('| Date | Series | Field | Currently | Would become |')
    L.push('|---|---|---|---|---|')
    for (const r of proposals.slice(0, 80)) {
      for (const p of r.proposed) {
        L.push(
          `| ${r.website.date ?? '?'} | ${r.website.seriesTitle} | \`${p.field}\` | ` +
            `${p.from ?? '_empty_'} | ${p.to.slice(0, 90)} |`,
        )
      }
    }
    if (proposals.length > 80) L.push(`| … | ${proposals.length - 80} more | | | |`)
    L.push('')
  }

  L.push('## Caveats')
  L.push('')
  L.push(`- ${inferred.length} dates were inferred from the post's publish date and month sequence,`)
  L.push('  not read off the page. Series crossing New Year are the likeliest to be wrong.')
  L.push('- Posts migrated in bulk (publish date 2019-08-16 / 2019-08-20) carry no reliable')
  L.push('  publish anchor, so inferred years there deserve spot-checking before any write.')
  L.push('- Two sermons on one date is expected: two campuses, two speakers. Both are kept.')
  L.push('')

  return L.join('\n')
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv()

  const args = process.argv.slice(2)
  const noDb = args.includes('--no-db')
  const all = args.includes('--all')
  const slugArg = args.find((a) => a.startsWith('--slug='))

  let slugs: string[]
  if (all) {
    console.log('Enumerating sermon posts…')
    slugs = await listSermonSlugs()
    const expected = await fetchCategoryCount()
    console.log(`  ${slugs.length} posts found${expected !== null ? ` (category reports ${expected})` : ''}`)
    if (expected !== null && slugs.length !== expected) {
      console.warn(`  ! COUNT MISMATCH — found ${slugs.length}, expected ${expected}. Report may be incomplete.`)
    }
  } else if (slugArg) {
    slugs = slugArg.slice('--slug='.length).split(',').map((s) => s.trim()).filter(Boolean)
  } else {
    slugs = ['turn-it-to-praise']
  }

  const posts: Post[] = []
  for (const [i, slug] of slugs.entries()) {
    process.stdout.write(`[${i + 1}/${slugs.length}] ${slug} … `)
    try {
      posts.push(await fetchPost(slug))
      console.log('ok')
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`)
    }
    await new Promise((r) => setTimeout(r, 250)) // be polite to the host
  }

  // A publish date shared by many posts is a bulk migration, not a real
  // publication — roughly 30 of these posts were imported on 2019-08-16/20.
  // Anchoring years on it produces confident, wrong dates, so it is refused.
  const dateCounts = new Map<string, number>()
  for (const p of posts) {
    const d = p.publishedAt?.slice(0, 10)
    if (d) dateCounts.set(d, (dateCounts.get(d) ?? 0) + 1)
  }
  const migrationDates = new Set([...dateCounts].filter(([, c]) => c >= 5).map(([d]) => d))
  if (migrationDates.size > 0) {
    console.log(
      `\nBulk-migration publish dates detected (not used as year anchors): ` +
        [...migrationDates].map((d) => `${d} ×${dateCounts.get(d)}`).join(', '),
    )
  }

  const website: WebsiteSermon[] = []
  for (const post of posts) {
    const trustPublishDate = !migrationDates.has(post.publishedAt?.slice(0, 10) ?? '')
    const parsed = parsePost(post, { trustPublishDate })
    website.push(...parsed)
  }

  console.log(`\n${website.length} sermons parsed from ${posts.length} posts`)

  const rows: ComparisonRow[] = []
  let payloadUnseen: Array<Record<string, unknown>> = []
  let payloadTotal = 0
  let dbChecked = false

  if (!noDb) {
    const { getPayload } = await import('payload')
    const configPromise = (await import('@payload-config')).default
    const payload = await getPayload({ config: configPromise })
    dbChecked = true

    const all = await payload.find({
      collection: 'sermons', limit: 5000, depth: 0, overrideAccess: true, draft: true,
    })
    payloadTotal = all.docs.length

    const byVideo = new Map<string, Record<string, any>>()
    const byAudio = new Map<string, Record<string, any>>()
    for (const doc of all.docs as Array<Record<string, any>>) {
      const v = extractVideoId(doc.youtubeURL)
      if (v) byVideo.set(v, doc)
      if (doc.audioURL) byAudio.set(String(doc.audioURL), doc)
    }
    console.log(`Payload: ${payloadTotal} sermons (${byVideo.size} with video, ${byAudio.size} with audio)`)

    const usedVideo = new Set<string>()

    for (const w of website) {
      const doc = (w.videoId && byVideo.get(w.videoId)) || (w.audioUrl && byAudio.get(w.audioUrl)) || null
      if (!doc) {
        rows.push({
          website: w,
          status: w.videoId || w.audioUrl ? 'missing-from-payload' : 'unmatchable',
          proposed: [],
        })
        continue
      }
      if (w.videoId) usedVideo.add(w.videoId)

      const proposed: ComparisonRow['proposed'] = []
      if (w.slidesUrl && doc.sermonPdfUrl !== w.slidesUrl) {
        proposed.push({ field: 'sermonPdfUrl', from: doc.sermonPdfUrl ?? null, to: w.slidesUrl })
      }
      if (w.discussionUrl && doc.discussionQuestions?.url !== w.discussionUrl) {
        proposed.push({
          field: 'discussionQuestions.url',
          from: doc.discussionQuestions?.url ?? null,
          to: w.discussionUrl,
        })
      }
      if (w.audioUrl && doc.audioURL !== w.audioUrl) {
        proposed.push({ field: 'audioURL', from: doc.audioURL ?? null, to: w.audioUrl })
      }

      rows.push({
        website: w,
        status: w.videoId ? 'matched-video' : 'matched-audio',
        payloadId: doc.id,
        payloadTitle: doc.title,
        payloadDate: typeof doc.date === 'string' ? doc.date.slice(0, 10) : undefined,
        proposed,
      })
    }

    payloadUnseen = (all.docs as Array<Record<string, any>>)
      .map((d) => ({
        id: d.id,
        title: d.title,
        date: typeof d.date === 'string' ? d.date.slice(0, 10) : null,
        videoId: extractVideoId(d.youtubeURL),
      }))
      .filter((p) => !p.videoId || !usedVideo.has(p.videoId as string))
  } else {
    for (const w of website) {
      rows.push({
        website: w,
        status: w.videoId || w.audioUrl ? 'missing-from-payload' : 'unmatchable',
        proposed: [],
      })
    }
  }

  const outDir = resolve(ROOT, 'reports')
  mkdirSync(outDir, { recursive: true })
  const base = `sermon-reconciliation-full-${new Date().toISOString().slice(0, 10)}`
  writeFileSync(
    resolve(outDir, `${base}.json`),
    JSON.stringify({ generatedAt: new Date().toISOString(), slugs, dbChecked, rows, payloadUnseen }, null, 2),
  )
  const md = buildMarkdown(rows, payloadTotal, payloadUnseen, dbChecked)
  writeFileSync(resolve(outDir, `${base}.md`), md)

  console.log(`\nReport written to reports/${base}.md and .json`)
  console.log('No data was written to Payload.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
