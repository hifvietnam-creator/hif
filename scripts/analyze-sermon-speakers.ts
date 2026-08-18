/**
 * scripts/analyze-sermon-speakers.ts
 *
 * READ-ONLY. Job 2, step 1.
 *
 * The website records speakers as free text — "JV", "Kester", "Pastor Kester",
 * "Mr. Kester", "Kester Scandrett", "Pastor Kester Scandrett" are plausibly one
 * person written six ways. Payload's `speaker` is a relationship to `team`, so
 * every one of those strings has to resolve to a record before 778 sermons can
 * be imported.
 *
 * This script does not decide anything. It groups the variants, guesses which
 * existing team member each cluster belongs to, and writes an editable mapping
 * file for a human to correct. A later import reads that file and nothing else,
 * so the guesses here can never silently become data.
 *
 * Outputs:
 *   reports/speaker-mapping-<date>.md      — review this
 *   config/sermon-speaker-map.json         — edit this, import consumes it
 *
 * Usage:
 *   pnpm analyze:speakers
 *   pnpm analyze:speakers --report=reports/sermon-reconciliation-full-2026-08-05.json
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

// ── Name handling ─────────────────────────────────────────────────────────────

const HONORIFICS =
  /^(pastor|ps\.?|rev\.?|reverend|dr\.?|doctor|mr\.?|mrs\.?|ms\.?|miss|bro\.?|brother|sis\.?|sister|elder|deacon)\s+/i

/** "PastorJacob Bloemberg" — the space gets lost on the website often enough to matter. */
const GLUED_HONORIFIC = /^(pastor|ps|rev|reverend|dr|doctor|mr|mrs|ms|bro|sis)(?=[A-Z])/i

/** Strips honorifics (repeatedly — "Pastor Pastor X" happens) and tidies spacing. */
function stripHonorifics(raw: string): string {
  let s = raw.trim().replace(/\s+/g, ' ')
  let prev = ''
  while (s !== prev) {
    prev = s
    s = s.replace(HONORIFICS, '').replace(GLUED_HONORIFIC, '')
  }
  return s.trim()
}

/**
 * Edit distance, used to tell a misspelling from a different person.
 * "Scandrette"/"Scandrett" and "Bloomberg"/"Bloemberg" are 1 apart and are the
 * same person; "Fizzard"/"Morris" share a given name and nothing else. Matching
 * on the given name alone cannot distinguish those two cases — it linked 177 of
 * Jason Fizzard's sermons to Jason Morris.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length || !b.length) return Math.max(a.length, b.length)
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(
        prev[j]! + 1,
        curr[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = curr
  }
  return prev[b.length]!
}

/**
 * Same person, spelled differently? Requires a shared given OR family name so
 * that two genuinely different short names can never collide, then allows a
 * small number of typos across the whole string.
 */
function isSpellingVariant(a: string, b: string): boolean {
  const ta = a.split(' ').filter(Boolean)
  const tb = b.split(' ').filter(Boolean)
  if (ta.length < 2 || tb.length < 2) return false
  const sharesAnchor = ta[0] === tb[0] || ta[ta.length - 1] === tb[tb.length - 1]
  if (!sharesAnchor) return false
  const budget = Math.min(2, Math.floor(Math.max(a.length, b.length) / 5))
  return levenshtein(a, b) <= Math.max(1, budget)
}

function normalize(raw: string): string {
  return stripHonorifics(raw)
    .toLowerCase()
    .replace(/[.,;:'"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const tokens = (s: string) => normalize(s).split(' ').filter(Boolean)

/** Prefers the fullest, most formal spelling as the label for a cluster. */
function pickCanonical(variants: Array<{ raw: string; count: number }>): string {
  return [...variants]
    .map((v) => ({ ...v, clean: stripHonorifics(v.raw) }))
    .sort((a, b) => {
      const at = a.clean.split(' ').length
      const bt = b.clean.split(' ').length
      if (at !== bt) return bt - at // more name parts wins
      if (a.count !== b.count) return b.count - a.count // then whichever is commoner
      return a.clean.localeCompare(b.clean)
    })[0]!.clean
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportRow {
  website: {
    speaker: string | null
    date: string | null
    seriesTitle: string
  }
}

interface Cluster {
  key: string
  canonical: string
  variants: Array<{ raw: string; count: number }>
  sermonCount: number
  firstSeen: string | null
  lastSeen: string | null
  teamId: string | null
  teamName: string | null
  confidence: 'exact' | 'spelling' | 'surname' | 'none'
  action: 'link' | 'create' | 'review'
}

function latestReport(): string {
  const dir = resolve(ROOT, 'reports')
  const files = readdirSync(dir)
    .filter((f) => f.startsWith('sermon-reconciliation-full-') && f.endsWith('.json'))
    .sort()
  if (files.length === 0) throw new Error('No report found. Run `pnpm compare:sermons:all` first.')
  return resolve(dir, files[files.length - 1]!)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv()

  const args = process.argv.slice(2)
  const reportArg = args.find((a) => a.startsWith('--report='))
  const reportPath = reportArg ? resolve(ROOT, reportArg.slice('--report='.length)) : latestReport()
  console.log(`Report: ${reportPath}`)

  const { rows } = JSON.parse(readFileSync(reportPath, 'utf8')) as { rows: ReportRow[] }

  // ── collect raw speaker strings ──
  const raw = new Map<string, { count: number; dates: string[]; series: Set<string> }>()
  let missing = 0
  for (const r of rows) {
    const s = r.website.speaker?.trim()
    if (!s) {
      missing++
      continue
    }
    if (!raw.has(s)) raw.set(s, { count: 0, dates: [], series: new Set() })
    const e = raw.get(s)!
    e.count++
    if (r.website.date) e.dates.push(r.website.date)
    e.series.add(r.website.seriesTitle)
  }
  console.log(`${raw.size} distinct speaker strings across ${rows.length} sermons (${missing} with none)\n`)

  // ── cluster ──
  // Start with exact normalized matches, then fold single-token names into a
  // fuller name when it is unambiguous. "Kester" folds into "Kester Scandrett";
  // it would NOT fold if two different Kesters existed.
  const byKey = new Map<string, Cluster>()
  for (const [rawName, info] of raw) {
    const key = normalize(rawName)
    if (!key) continue
    if (!byKey.has(key)) {
      byKey.set(key, {
        key,
        canonical: '',
        variants: [],
        sermonCount: 0,
        firstSeen: null,
        lastSeen: null,
        teamId: null,
        teamName: null,
        confidence: 'none',
        action: 'review',
      })
    }
    const c = byKey.get(key)!
    c.variants.push({ raw: rawName, count: info.count })
    c.sermonCount += info.count
    const sorted = info.dates.sort()
    if (sorted.length) {
      if (!c.firstSeen || sorted[0]! < c.firstSeen) c.firstSeen = sorted[0]!
      if (!c.lastSeen || sorted[sorted.length - 1]! > c.lastSeen) c.lastSeen = sorted[sorted.length - 1]!
    }
  }

  const absorb = (target: Cluster, source: Cluster) => {
    target.variants.push(...source.variants)
    target.sermonCount += source.sermonCount
    if (source.firstSeen && (!target.firstSeen || source.firstSeen < target.firstSeen)) {
      target.firstSeen = source.firstSeen
    }
    if (source.lastSeen && (!target.lastSeen || source.lastSeen > target.lastSeen)) {
      target.lastSeen = source.lastSeen
    }
  }

  // Pass 1: fold misspellings together. Doing this BEFORE the single-token pass
  // matters — "Kester" looked ambiguous only because "Kester Scandrett" and
  // "Kester Scandrette" were still counted as two different people.
  let multi = [...byKey.values()].filter((c) => tokens(c.key).length > 1)
  const spellingMerges: Array<{ kept: string; folded: string }> = []
  multi.sort((a, b) => b.sermonCount - a.sermonCount) // commonest spelling wins
  const keptMulti: Cluster[] = []
  for (const c of multi) {
    const host = keptMulti.find((k) => isSpellingVariant(k.key, c.key))
    if (host) {
      absorb(host, c)
      spellingMerges.push({ kept: host.key, folded: c.key })
    } else {
      keptMulti.push(c)
    }
  }
  multi = keptMulti

  const single = [...byKey.values()].filter((c) => tokens(c.key).length === 1)
  const merged = new Map<string, Cluster>()
  for (const c of multi) merged.set(c.key, c)

  const ambiguous: Array<{ name: string; candidates: string[] }> = []
  for (const s of single) {
    const token = tokens(s.key)[0]!
    const hits = multi.filter((m) => tokens(m.key).includes(token))
    if (hits.length === 1) {
      absorb(merged.get(hits[0]!.key)!, s)
    } else {
      // Zero matches, or more than one — a guess here would be a coin flip.
      if (hits.length > 1) ambiguous.push({ name: s.canonical || s.key, candidates: hits.map((h) => h.key) })
      merged.set(s.key, s)
    }
  }

  for (const c of merged.values()) c.canonical = pickCanonical(c.variants)

  // ── apply hand-made decisions ──
  // These live in a separate file because this script overwrites the generated
  // map on every run. Anything recorded only in the map would be lost; anything
  // recorded here survives.
  const overridesPath = resolve(ROOT, 'config/sermon-speaker-overrides.json')
  let overrides: {
    defaultRole?: string
    merge?: Array<{ canonical: string; absorb: string[]; reason?: string }>
    coSpeakers?: Record<string, string>
  } = {}
  if (existsSync(overridesPath)) {
    overrides = JSON.parse(readFileSync(overridesPath, 'utf8'))
    console.log(`Overrides: ${overridesPath.replace(ROOT, '.')}`)
  }

  const appliedMerges: string[] = []
  const unmatchedRules: string[] = []
  for (const rule of overrides.merge ?? []) {
    const targetKey = normalize(rule.canonical)
    let target = merged.get(targetKey)
    if (!target) {
      // The target may itself only exist as one of the keys being absorbed.
      const fallbackKey = rule.absorb.find((k) => merged.has(normalize(k)))
      if (!fallbackKey) {
        unmatchedRules.push(`${rule.canonical} — no matching cluster`)
        continue
      }
      target = merged.get(normalize(fallbackKey))!
      merged.delete(normalize(fallbackKey))
      merged.set(targetKey, target)
      target.key = targetKey
    }
    for (const raw of rule.absorb) {
      const k = normalize(raw)
      if (k === target.key) continue
      const source = merged.get(k)
      if (!source) continue
      absorb(target, source)
      merged.delete(k)
      appliedMerges.push(`${rule.canonical} ← ${raw}`)
    }
    target.canonical = rule.canonical
  }
  if (unmatchedRules.length > 0) {
    console.log(`\n! Override rules that matched nothing (stale?):`)
    for (const u of unmatchedRules) console.log(`   ${u}`)
    console.log('')
  }

  // ── match against existing team ──
  const { getPayload } = await import('payload')
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  const teamRes = await payload.find({
    collection: 'team',
    limit: 500,
    depth: 0,
    overrideAccess: true,
    select: { name: true, role: true },
  })
  const team = teamRes.docs.map((t) => ({
    id: String(t.id),
    name: t.name as string,
    key: normalize(t.name as string),
  }))
  console.log(`Payload team: ${team.length} members\n`)

  for (const c of merged.values()) {
    const exact = team.find((t) => t.key === c.key)
    if (exact) {
      c.teamId = exact.id
      c.teamName = exact.name
      c.confidence = 'exact'
      c.action = 'link'
      continue
    }
    // A near-identical spelling with a shared given or family name is safe to link.
    const spelling = team.filter((t) => isSpellingVariant(t.key, c.key))
    if (spelling.length === 1) {
      c.teamId = spelling[0]!.id
      c.teamName = spelling[0]!.name
      c.confidence = 'spelling'
      c.action = 'link'
      continue
    }

    // A shared surname is suggestive but not proof — two Nguyens are not one person.
    const ct = tokens(c.key)
    const surname = ct[ct.length - 1]!
    const bySurname = team.filter((t) => ct.length > 1 && tokens(t.key).includes(surname))
    if (bySurname.length === 1) {
      c.teamId = bySurname[0]!.id
      c.teamName = bySurname[0]!.name
      c.confidence = 'surname'
      c.action = 'review'
      continue
    }

    // Matching on the given name alone is NOT done: it cannot distinguish a typo
    // from a different person, and produced Jason Fizzard → Jason Morris.
    c.action = 'create'
  }

  const clusters = [...merged.values()].sort((a, b) => b.sermonCount - a.sermonCount)

  // ── write the editable mapping ──
  const mapPath = resolve(ROOT, 'config/sermon-speaker-map.json')
  mkdirSync(dirname(mapPath), { recursive: true })
  if (existsSync(mapPath)) {
    const backup = mapPath.replace(/\.json$/, `.${Date.now()}.bak.json`)
    writeFileSync(backup, readFileSync(mapPath))
    console.log(`Existing map backed up to ${backup.replace(ROOT, '.')}`)
  }
  writeFileSync(
    mapPath,
    JSON.stringify(
      {
        _instructions: [
          'Edit `action` on each entry, then run the import. Nothing else reads these guesses.',
          "  link   — use the given teamId (check teamName is the right person)",
          '  create — make a new team member named `canonical`',
          '  review — unresolved; the importer will REFUSE to run while any remain',
          'Merge two entries by giving them the same teamId and action "link".',
          'To leave a speaker unset on the sermon, set action to "link" and teamId to null.',
        ],
        generatedAt: new Date().toISOString(),
        sourceReport: reportPath.replace(ROOT, '.'),
        defaultRole: overrides.defaultRole ?? 'Guest Speaker',
        coSpeakers: overrides.coSpeakers ?? {},
        speakers: clusters.map((c) => ({
          canonical: c.canonical,
          action: c.action,
          teamId: c.teamId,
          teamName: c.teamName,
          // `role` is required on the team collection; only used when action is "create".
          role: overrides.defaultRole ?? 'Guest Speaker',
          // Keeps auto-created speakers off the public About page.
          staffMember: false,
          confidence: c.confidence,
          sermonCount: c.sermonCount,
          activeBetween: [c.firstSeen, c.lastSeen],
          variants: c.variants.sort((a, b) => b.count - a.count).map((v) => v.raw),
        })),
      },
      null,
      2,
    ),
  )

  // ── write the review report ──
  const L: string[] = []
  const need = clusters.filter((c) => c.action === 'review')
  const create = clusters.filter((c) => c.action === 'create')
  const link = clusters.filter((c) => c.action === 'link')

  L.push('# Sermon speakers — mapping for review')
  L.push('')
  L.push(`Generated ${new Date().toISOString()} · **read-only, nothing written to Payload**`)
  L.push('')
  L.push(`${raw.size} distinct strings on the website collapse to **${clusters.length} people**.`)
  L.push('')
  L.push('| | Count |')
  L.push('|---|---:|')
  L.push(`| Sermons with a speaker | ${rows.length - missing} |`)
  L.push(`| Sermons with no speaker parsed | ${missing} |`)
  L.push(`| Distinct raw strings | ${raw.size} |`)
  L.push(`| Distinct people after clustering | ${clusters.length} |`)
  L.push(`| Matched to an existing team member | ${link.length} |`)
  L.push(`| Need a new team member | ${create.length} |`)
  L.push(`| Uncertain — need your eyes | ${need.length} |`)
  L.push('')

  if (need.length > 0) {
    L.push('## Uncertain — decide these')
    L.push('')
    L.push('Matched on part of a name only. Confirm or correct in `config/sermon-speaker-map.json`.')
    L.push('')
    L.push('| Website name | Guessed team member | Matched on | Sermons |')
    L.push('|---|---|---|---:|')
    for (const c of need) {
      L.push(`| ${c.canonical} | ${c.teamName ?? '—'} | ${c.confidence} | ${c.sermonCount} |`)
    }
    L.push('')
  }

  if (appliedMerges.length > 0) {
    L.push('## Merges you decided')
    L.push('')
    L.push('From `config/sermon-speaker-overrides.json`, reapplied on every run.')
    L.push('')
    for (const m of appliedMerges) L.push(`- ${m}`)
    L.push('')
  }

  if (spellingMerges.length > 0) {
    L.push('## Spellings folded together')
    L.push('')
    L.push('Treated as one person: same given or family name, within a couple of')
    L.push('characters. Check none of these are actually two different people.')
    L.push('')
    L.push('| Kept | Folded in |')
    L.push('|---|---|')
    for (const m of spellingMerges) L.push(`| ${m.kept} | ${m.folded} |`)
    L.push('')
  }

  // Nicknames are too far apart for edit distance ("Mike"/"Michael" is 4 edits)
  // and too risky to merge automatically — brothers share surnames. Surface them.
  const surnameGroups = new Map<string, Cluster[]>()
  for (const c of clusters) {
    const t = tokens(c.key)
    if (t.length < 2) continue
    const surname = t[t.length - 1]!
    surnameGroups.set(surname, [...(surnameGroups.get(surname) ?? []), c])
  }
  const nicknameCandidates = [...surnameGroups.values()].filter((g) => g.length > 1)
  if (nicknameCandidates.length > 0) {
    L.push('## Same surname, different given name')
    L.push('')
    L.push('Possibly one person under a nickname, possibly two relatives. Not merged')
    L.push('automatically — decide each one. To merge, give them the same `teamId`')
    L.push('and set both to `link`.')
    L.push('')
    for (const g of nicknameCandidates) {
      L.push(
        `- ${g.map((c) => `**${c.canonical}** (${c.sermonCount})`).join(' · ')}`,
      )
    }
    L.push('')
  }

  if (ambiguous.length > 0) {
    L.push('## First-name-only, more than one candidate')
    L.push('')
    L.push('Deliberately left unmerged — a guess here would be a coin flip.')
    L.push('')
    for (const a of ambiguous) {
      L.push(`- **${a.name}** could be: ${a.candidates.join(' · ')}`)
    }
    L.push('')
  }

  L.push('## Everyone, by sermon count')
  L.push('')
  L.push('| Person | Action | Sermons | Active | Variants on the website |')
  L.push('|---|---|---:|---|---|')
  for (const c of clusters) {
    const active =
      c.firstSeen && c.lastSeen
        ? `${c.firstSeen.slice(0, 4)}–${c.lastSeen.slice(0, 4)}`
        : '—'
    L.push(
      `| ${c.canonical} | ${c.action} | ${c.sermonCount} | ${active} | ${c.variants.map((v) => v.raw).join(' · ')} |`,
    )
  }
  L.push('')

  L.push('## How created speakers are configured')
  L.push('')
  L.push(`- \`role\`: **${overrides.defaultRole ?? 'Guest Speaker'}** (the field is required)`)
  L.push('- `staffMember`: **false** — the About page queries `staffMember: true`,')
  L.push('  so imported speakers stay off it while remaining available as sermon filters.')
  L.push('')
  if (Object.keys(overrides.coSpeakers ?? {}).length > 0) {
    L.push('Sermons naming two speakers keep the first as `speaker`; the second is')
    L.push('recorded so the import can note them rather than lose them:')
    L.push('')
    for (const [k, v] of Object.entries(overrides.coSpeakers ?? {})) {
      L.push(`- \`${k}\` → also ${v}`)
    }
    L.push('')
  }

  const mdPath = resolve(ROOT, `reports/speaker-mapping-${new Date().toISOString().slice(0, 10)}.md`)
  writeFileSync(mdPath, L.join('\n'))

  console.log(`${clusters.length} people · ${link.length} matched · ${create.length} new · ${need.length} uncertain`)
  console.log(`\nReview  ${mdPath.replace(ROOT, '.')}`)
  console.log(`Edit    ${mapPath.replace(ROOT, '.')}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
