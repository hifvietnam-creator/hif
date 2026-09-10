/**
 * wl_songs_scraper/probe.ts
 *
 * Read-only reconnaissance for the worship-leader song downloader.
 * Nothing is downloaded and nothing is written to the archive.
 *
 * Revised after the first run, which corrected three assumptions:
 *
 *   1. `/services/v2/team_positions` returns nothing matching "Worship Leader".
 *      The name lives on `team_position_name` of a plan's team_members, so this
 *      now reports the position names actually seen on plans instead.
 *   2. Plan items do not carry `item_type === 'song'` — a plan with 31 items
 *      reported zero. Songs are identified by having a `song` relationship.
 *   3. `plan_times.starts_at` is UTC; 01:30 there is the 08:30 service here.
 *      Times are shown in local time.
 *
 * Usage (from the project root):
 *   npx tsx --tsconfig tsconfig.scripts.json wl_songs_scraper/probe.ts
 *
 * Options:
 *   --months 24        how far back to sample plans (default from config)
 *   --plans 6          how many plans to inspect in song-level detail
 *   --all-types        probe every service type, not just the configured ones
 *   --test-open        open ONE attachment of EACH kind, to see what it really serves
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { Rec } from './lib/plans'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

function loadEnv() {
  try {
    const envFile = readFileSync(resolve(ROOT, '.env'), 'utf8')
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim()
    }
  } catch {}
}
loadEnv()

const { whoami } = await import('../src/lib/pco')
const cfg = await import('./config')
const P = await import('./lib/plans')
const L = await import('./lib/leaders')
const A = await import('./lib/attachments')
const { planFolder } = await import('./lib/paths')

// ── CLI ──────────────────────────────────────────────────────────────────────

const argv = process.argv
const num = (name: string, fallback: number) => {
  const i = argv.indexOf(`--${name}`)
  if (i < 0) return fallback
  const n = parseInt(argv[i + 1] ?? '', 10)
  return Number.isFinite(n) ? n : fallback
}
const has = (name: string) => argv.includes(`--${name}`)

const MONTHS = num('months', cfg.PROBE_MONTHS_BACK)
const DETAIL_PLANS = num('plans', 6)
const ALL_TYPES = has('all-types')
const TEST_OPEN = has('test-open')

// ── Output ───────────────────────────────────────────────────────────────────

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const bad = (m: string) => console.log(`  \x1b[31m✗\x1b[0m ${m}`)
const warn = (m: string) => console.log(`  \x1b[33m!\x1b[0m ${m}`)
const head = (s: string) => console.log(`\n${bold(s)}\n`)
const onWarn = (m: string) => warn(m)

/** UTC instant → local HH:MM, so 01:30Z reads as the 08:30 service. */
function localTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '?'
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

console.log(bold('\nWorship-leader song downloader — reconnaissance'))
console.log(dim('Read-only. Nothing is written to the archive.'))
if (TEST_OPEN) console.log(dim('--test-open: one `open` POST per kind of attachment.'))
console.log()

// 1. Credentials ─────────────────────────────────────────────────────────────

head('1. Credentials')
try {
  const me = await whoami()
  ok(`Authenticated as ${me.name} (person ${me.id})`)
} catch (err) {
  bad(`Could not authenticate: ${err instanceof Error ? err.message : err}`)
  process.exit(1)
}

// 2. Service types ───────────────────────────────────────────────────────────

head('2. Service types')
const allTypes = await P.getAll('/services/v2/service_types', onWarn)
const wantedIds = new Set(cfg.SERVICE_TYPE_IDS)
const chosen = ALL_TYPES || wantedIds.size === 0 ? allTypes : allTypes.filter((t) => wantedIds.has(t.id))

for (const st of allTypes) {
  const mark = chosen.some((c) => c.id === st.id) ? '\x1b[32m●\x1b[0m' : dim('○')
  console.log(`  ${mark} ${st.id.padEnd(10)} ${P.attr<string>(st, 'name') ?? '—'}`)
}
console.log(dim(`\n  ● = filed into the archive (SERVICE_TYPE_IDS in config.ts)`))

// 3. Plans and leaders ───────────────────────────────────────────────────────

const since = new Date()
since.setMonth(since.getMonth() - MONTHS)
const sinceISO = since.toISOString().slice(0, 10)
const todayISO = new Date().toISOString().slice(0, 10)

head(`3. Plans since ${sinceISO}`)

type Row = {
  serviceType: string
  serviceTypeId: string
  planId: string
  date: string
  title: string
  times: string[]
  leaders: string[]
  songCount?: number
}
const rows: Row[] = []
const positionNamesSeen = new Map<string, number>()

for (const st of chosen) {
  const stName = P.attr<string>(st, 'name') ?? st.id
  const plans = await P.listPlans(st.id, stName, { since: sinceISO }, onWarn)
  console.log(`  ${bold(stName)} — ${plans.length} plan(s)`)

  for (const plan of plans) {
    const members = await P.getAll(
      `/services/v2/service_types/${plan.serviceTypeId}/plans/${plan.planId}/team_members`,
      onWarn,
    )
    for (const m of members) {
      const pos = String(P.attr<string>(m, 'team_position_name') ?? '').trim()
      if (pos) positionNamesSeen.set(pos, (positionNamesSeen.get(pos) ?? 0) + 1)
    }

    const want = L.norm(cfg.WORSHIP_LEADER_POSITION)
    const leaders = [
      ...new Set(
        members
          .filter((m) => L.norm(String(P.attr<string>(m, 'team_position_name') ?? '')) === want)
          .map((m) => String(P.attr<string>(m, 'name') ?? '').trim())
          .filter(Boolean),
      ),
    ]

    const times = await P.getAll(
      `/services/v2/service_types/${plan.serviceTypeId}/plans/${plan.planId}/plan_times`,
      onWarn,
    )

    rows.push({
      serviceType: stName,
      serviceTypeId: plan.serviceTypeId,
      planId: plan.planId,
      date: plan.date,
      title: plan.title,
      times: times
        .map((t) => localTime(String(P.attr<string>(t, 'starts_at') ?? '')))
        .filter((t) => t !== '?'),
      leaders,
    })
  }
}

rows.sort((a, b) => b.date.localeCompare(a.date))

console.log()
console.log('  ' + 'date'.padEnd(12) + 'times (local)'.padEnd(22) + 'worship leader(s)')
console.log('  ' + '─'.repeat(84))
for (const r of rows.slice(0, 40)) {
  const future = r.date > todayISO ? dim(' ·future') : ''
  console.log(
    '  ' +
      r.date.padEnd(12) +
      (r.times.join(' ') || '—').padEnd(22) +
      (r.leaders.join(' + ') || dim('(none scheduled)')) +
      future,
  )
}
if (rows.length > 40) console.log(dim(`  … ${rows.length - 40} more`))

// 4. Position names ──────────────────────────────────────────────────────────

head('4. Position names seen on these plans')
const posSorted = [...positionNamesSeen.entries()].sort((a, b) => b[1] - a[1])
for (const [name, n] of posSorted.slice(0, 25)) {
  const isTarget = L.norm(name) === L.norm(cfg.WORSHIP_LEADER_POSITION)
  console.log(`  ${isTarget ? '\x1b[32m→\x1b[0m' : ' '} ${name.padEnd(34)} ${dim(String(n))}`)
}
if (!posSorted.some(([n]) => L.norm(n) === L.norm(cfg.WORSHIP_LEADER_POSITION))) {
  warn(`Nothing matched WORSHIP_LEADER_POSITION = "${cfg.WORSHIP_LEADER_POSITION}".`)
  console.log(dim('  Pick the right name from the list above and set it in config.ts.'))
}

const noLeader = rows.filter((r) => r.leaders.length === 0)
const twoLeaders = rows.filter((r) => r.leaders.length > 1)
if (noLeader.length) warn(`${noLeader.length} plan(s) with no worship leader — these are skipped.`)
if (twoLeaders.length) warn(`${twoLeaders.length} plan(s) with two leaders — files go to both folders.`)

// 5. Mapping ─────────────────────────────────────────────────────────────────

head('5. Leader names vs archive folders')

const folders = L.listLeaderFolders(cfg.LEADERS_ROOT, cfg.NON_PERSON_FOLDERS)
if (folders.length === 0) bad(`No folders found under ${cfg.LEADERS_ROOT}`)
else ok(`${folders.length} leader folder(s).`)

const overrides = L.loadOverrides(resolve(ROOT, cfg.MAPPING_FILE))
if (Object.keys(overrides).length) ok(`${Object.keys(overrides).length} override(s) from mapping.json`)

const uniqueLeaders = [...new Set(rows.flatMap((r) => r.leaders))].sort()
const matches = uniqueLeaders.map((n) => L.matchFolder(n, folders, overrides))

console.log()
console.log('  ' + 'PCO name'.padEnd(32) + 'folder'.padEnd(22) + 'how')
console.log('  ' + '─'.repeat(76))
for (const m of matches) {
  const colour = L.isTrusted(m) ? '\x1b[32m' : m.folder ? '\x1b[33m' : '\x1b[31m'
  console.log(
    '  ' +
      m.pcoName.slice(0, 31).padEnd(32) +
      `${colour}${(m.folder ?? '— none —').slice(0, 21).padEnd(22)}\x1b[0m` +
      m.confidence +
      (m.alternatives.length ? dim(`  candidates: ${m.alternatives.join(', ')}`) : ''),
  )
}

const needsHand = matches.filter((m) => !L.isTrusted(m))
if (needsHand.length) {
  warn(`${needsHand.length} leader(s) will be SKIPPED until settled in mapping.json.`)
  console.log(dim('  Paste into mapping.json, replacing each value with the right folder:\n'))
  for (const m of needsHand) {
    const hints = L.suggest(m.pcoName, folders)
    const guess = m.confidence === 'token' && m.folder ? m.folder : (hints[0] ?? '')
    console.log(
      `      "${m.pcoName}": "${guess}",` +
        dim(hints.length ? `   candidates: ${hints.join(', ')}` : '   no similar folder found'),
    )
  }
  console.log(
    dim(
      `\n  Every value above is a GUESS — check each one. A "token" match means a\n` +
        `  single shared word, which is how "Mary Ann Japon" lands on "Judy Ann".`,
    ),
  )
}

// 6. Songs and attachments ───────────────────────────────────────────────────

head('6. Songs and their files')

const candidates = rows.filter((r) => r.leaders.length > 0).slice(0, DETAIL_PLANS)
let sampleAttachment: Rec | null = null
let sampleFrom = ''

for (const r of candidates) {
  const plan = {
    serviceTypeId: r.serviceTypeId,
    serviceTypeName: r.serviceType,
    planId: r.planId,
    date: r.date,
    title: r.title,
  }
  const songs = await P.planSongs(plan, onWarn)
  r.songCount = songs.length

  const dest = L.isTrusted(L.matchFolder(r.leaders[0]!, folders, overrides))
    ? planFolder(cfg.LEADERS_ROOT, L.matchFolder(r.leaders[0]!, folders, overrides).folder!, r.date)
    : null

  console.log(`  ${bold(r.date)}  ${r.leaders.join(' + ')}  ${dim(`${songs.length} song(s)`)}`)
  if (dest) console.log(dim(`      → ${dest}`))

  let files = 0
  for (const s of songs) {
    const atts = await P.songAttachments(s, onWarn)
    const links = atts.filter((a) => !A.isDownloadableFile(a.attachment)).length
    const realFiles = atts.length - links // links are attachments, but not files
    files += realFiles
    console.log(
      `      ${s.title.slice(0, 40).padEnd(42)}${dim(
        `key ${s.keyName ?? '—'}  ${realFiles} file(s)${links ? `, ${links} link(s)` : ''}`,
      )}`,
    )
    if (!sampleAttachment && atts.length) {
      const real = atts.find((a) => A.isDownloadableFile(a.attachment)) ?? atts[0]!
      sampleAttachment = real.attachment
      sampleFrom = `${s.title} (${real.origin})`
    }
  }
  console.log(dim(`      ${files} downloadable file(s) for this Sunday\n`))
}

// 7. Attachment kinds ────────────────────────────────────────────────────────
//
// One sample was not enough: it showed a stored PDF and hid the fact that
// `viewchordsheet` entries are web views wearing a filename. Group everything
// seen by (pco_type, filetype, content_type) so each distinct kind is visible.

head('7. Kinds of attachment seen')

type Kind = { count: number; example: Rec; verdict: boolean }
const kinds = new Map<string, Kind>()

for (const r of candidates) {
  const plan = {
    serviceTypeId: r.serviceTypeId,
    serviceTypeName: r.serviceType,
    planId: r.planId,
    date: r.date,
    title: r.title,
  }
  for (const s of await P.planSongs(plan, onWarn)) {
    for (const { attachment } of await P.songAttachments(s, onWarn)) {
      const a = attachment.attributes ?? {}
      const key = [a.pco_type ?? '—', a.filetype ?? '—', a.content_type ?? '—'].join(' | ')
      const existing = kinds.get(key)
      if (existing) existing.count++
      else
        kinds.set(key, {
          count: 1,
          example: attachment,
          verdict: A.isDownloadableFile(attachment),
        })
    }
  }
}

console.log(
  '  ' + 'pco_type'.padEnd(20) + 'filetype'.padEnd(12) + 'content_type'.padEnd(22) + 'n'.padStart(4) + '  downloaded?',
)
console.log('  ' + '─'.repeat(78))
for (const [key, k] of [...kinds.entries()].sort((a, b) => b[1].count - a[1].count)) {
  const [pcoType, filetype, contentType] = key.split(' | ')
  const size = P.attr<number>(k.example, 'file_size')
  console.log(
    '  ' +
      String(pcoType).slice(0, 19).padEnd(20) +
      String(filetype).slice(0, 11).padEnd(12) +
      String(contentType).slice(0, 21).padEnd(22) +
      String(k.count).padStart(4) +
      '  ' +
      (k.verdict ? '\x1b[32myes\x1b[0m' : '\x1b[33mno — treated as a link\x1b[0m') +
      dim(size ? `  (file_size ${size})` : '  (no file_size)'),
  )
}
console.log(
  dim(
    '\n  A kind marked "no" is skipped. `viewchordsheet` belongs there: it looks\n' +
      '  like a file in every field, but its signed URL serves an HTML page.',
  ),
)

head('7a. What one attachment record exposes')

if (!sampleAttachment) {
  warn('No attachments found on the sampled plans. Try --plans 20.')
} else {
  console.log(dim(`  from: ${sampleFrom}\n`))
  for (const [k, v] of Object.entries(sampleAttachment.attributes ?? {})) {
    const shown = typeof v === 'string' && v.length > 68 ? `${v.slice(0, 68)}…` : JSON.stringify(v)
    console.log(`      ${k.padEnd(24)} ${shown}`)
  }

  const direct = A.directUrl(sampleAttachment)
  console.log()
  if (direct) {
    ok('This record carries a direct file URL — no POST needed to download.')
  } else {
    console.log(
      `  ${bold('No direct URL on the record.')} Downloading needs the attachment\n` +
        `  \`open\` action (one POST). That is what lib/attachments.ts does.`,
    )
  }

  if (!TEST_OPEN) {
    console.log(dim('\n  Re-run with --test-open to check what each kind actually serves.'))
  }
}

// 7b. What each kind actually serves ─────────────────────────────────────────
//
// Testing one attachment only proved one kind worked. `viewchordsheet` slipped
// through precisely because it was never the sample. So test ONE of every kind:
// a single POST each, then a one-byte ranged GET. Cheap, and it settles the
// question by evidence instead of by suspicion.

if (TEST_OPEN && kinds.size) {
  head('7b. What each kind actually serves')
  console.log(dim('  One `open` POST plus a 1-byte ranged GET per kind.\n'))

  for (const [key, k] of kinds) {
    const [pcoType, filetype] = key.split(' | ')
    const label = `${String(pcoType).slice(0, 22)} / ${filetype}`
    try {
      const url = await A.openAttachment(k.example.id)
      if (!url) {
        console.log(`  ${label.padEnd(34)} ${dim('open returned no URL')}`)
        continue
      }
      const v = await A.verifyUrl(url)
      const isHtml = String(v.contentType ?? '').includes('text/html')
      const mark = !v.ok ? '\x1b[31m✗\x1b[0m' : isHtml ? '\x1b[33m~\x1b[0m' : '\x1b[32m✓\x1b[0m'
      const meaning = !v.ok
        ? `HTTP ${v.status}`
        : isHtml
          ? 'a WEB PAGE, not a file'
          : `a real file — ${v.contentType}`
      console.log(
        `  ${mark} ${label.padEnd(34)} ${meaning}` +
          dim(`  ${v.contentLength ?? ''}`) +
          (k.verdict ? dim('  [downloaded]') : dim('  [skipped]')),
      )

      // The check that matters: does the code's verdict match reality?
      if (k.verdict && (isHtml || !v.ok)) {
        bad(`    ${label} is DOWNLOADED but does not serve a file. Fix isDownloadableFile().`)
      }
      if (!k.verdict && v.ok && !isHtml) {
        warn(`    ${label} is SKIPPED but serves a real file — you may be losing content.`)
      }
    } catch (err) {
      console.log(`  ${label.padEnd(34)} ${dim(String(err instanceof Error ? err.message : err).slice(0, 60))}`)
    }
  }
  console.log(
    dim('\n  A ✓ marked [skipped] or a ~ marked [downloaded] means the rules are wrong.'),
  )
}

// 8. Report ──────────────────────────────────────────────────────────────────

const report = {
  generatedAt: new Date().toISOString(),
  monthsSampled: MONTHS,
  serviceTypesConsidered: chosen.map((s) => ({ id: s.id, name: P.attr<string>(s, 'name') })),
  positionNamesSeen: Object.fromEntries(posSorted),
  plans: rows,
  archiveFolders: folders,
  proposedMapping: matches,
  needsHandMapping: needsHand.map((m) => m.pcoName),
  attachmentKinds: [...kinds.entries()].map(([key, k]) => {
    const [pcoType, filetype, contentType] = key.split(' | ')
    return {
      pcoType,
      filetype,
      contentType,
      count: k.count,
      downloaded: k.verdict,
      exampleAttributes: k.example.attributes ?? null,
    }
  }),
  sampleAttachmentAttributes: sampleAttachment?.attributes ?? null,
}

writeFileSync(resolve(ROOT, cfg.PROBE_REPORT), JSON.stringify(report, null, 2), 'utf8')
console.log(`\n${bold('Report written')}  ${cfg.PROBE_REPORT}\n`)
