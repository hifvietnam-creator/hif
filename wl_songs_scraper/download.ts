/**
 * wl_songs_scraper/download.ts
 *
 * Downloads every song file for a Sunday plan into the worship leader's folder.
 *
 *     <archive>\<Leader>\<YYYY>\<MONTH>\<Month DD>\
 *     ...\Worship Leaders Line-up\Lovella\2026\SEPTEMBER\September 06\
 *
 * Rules, all deliberate:
 *   · Every attachment on every song — all keys, lyrics sheets included.
 *   · A leader with no confidently matched folder is SKIPPED and reported.
 *     Folders are never created for a leader; only the dated folders inside an
 *     existing leader folder are.
 *   · Two leaders on one plan means both get the same files.
 *   · A file already present with a non-zero size is left alone, so re-running
 *     is cheap and safe.
 *   · Files are written to <name>.part and renamed only once complete, so an
 *     interrupted run never leaves a truncated PDF looking finished.
 *   · Nothing in the existing archive is renamed, moved or deleted. Ever.
 *
 * Usage (from the project root):
 *   npx tsx --tsconfig tsconfig.scripts.json wl_songs_scraper/download.ts --next --dry-run
 *   npx tsx --tsconfig tsconfig.scripts.json wl_songs_scraper/download.ts --next
 *
 * Selecting plans:
 *   --next             the next plan on or after today (default)
 *   --date 2026-09-13  one specific plan date
 *   --since 2026-01-01 [--until 2026-06-30]   a range, for backfilling
 *   --last 4           the most recent N plans up to today
 *
 * Other options:
 *   --dry-run          list what would be written, download nothing
 *   --service-type ID  override config (repeatable)
 *   --force            re-download even if the file already exists
 */

import { readFileSync, existsSync, mkdirSync, statSync, renameSync, readdirSync, createWriteStream } from 'fs'
import { resolve, dirname, join, basename } from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'
import type { Plan } from './lib/plans'
import { pipeline } from 'stream/promises'

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

const cfg = await import('./config')
const P = await import('./lib/plans')
const L = await import('./lib/leaders')
const A = await import('./lib/attachments')
const { planFolder, safeSegment, resolveCollisions, splitExtension } = await import('./lib/paths')

// ── CLI ──────────────────────────────────────────────────────────────────────

const argv = process.argv
const has = (n: string) => argv.includes(`--${n}`)
const val = (n: string): string | null => {
  const i = argv.indexOf(`--${n}`)
  return i >= 0 ? (argv[i + 1] ?? null) : null
}
const nums = (n: string, d: number) => {
  const v = val(n)
  const p = v ? parseInt(v, 10) : NaN
  return Number.isFinite(p) ? p : d
}
const multi = (n: string): string[] => {
  const out: string[] = []
  argv.forEach((a, i) => {
    if (a === `--${n}` && argv[i + 1]) out.push(argv[i + 1]!)
  })
  return out
}

const DRY = has('dry-run')
const FORCE = has('force')
const TODAY = new Date().toISOString().slice(0, 10)

const serviceTypeIds = multi('service-type').length ? multi('service-type') : cfg.SERVICE_TYPE_IDS

// ── Output ───────────────────────────────────────────────────────────────────

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const warnings: string[] = []
const onWarn = (m: string) => {
  warnings.push(m)
}

const stats = {
  plans: 0, songs: 0, downloaded: 0, skippedExisting: 0,
  links: 0, failed: 0, bytes: 0, notReady: 0, noSongFiles: 0,
}
const skippedLeaders = new Map<string, string[]>() // leader → dates

// ── Choose plans ─────────────────────────────────────────────────────────────

async function selectPlans(): Promise<Plan[]> {
  const types = await P.getAll('/services/v2/service_types', onWarn)
  const wanted = new Set(serviceTypeIds)
  const chosen = wanted.size ? types.filter((t) => wanted.has(t.id)) : types

  if (chosen.length === 0) {
    throw new Error(`No service type matched ${[...wanted].join(', ') || '(none configured)'}`)
  }

  let all: Plan[] = []
  for (const st of chosen) {
    all.push(...(await P.listPlans(st.id, P.attr<string>(st, 'name') ?? st.id, {}, onWarn)))
  }
  all.sort((a, b) => a.date.localeCompare(b.date))

  const date = val('date')
  if (date) return all.filter((p) => p.date === date)

  const since = val('since')
  if (since) {
    const until = val('until')
    return all.filter((p) => p.date >= since && (!until || p.date <= until))
  }

  const last = has('last') ? nums('last', 1) : 0
  if (last > 0) return all.filter((p) => p.date <= TODAY).slice(-last)

  // Default: --next — the soonest plan on or after today.
  const upcoming = all.filter((p) => p.date >= TODAY)
  return upcoming.length ? [upcoming[0]!] : []
}

type Pending = {
  attachment: Awaited<ReturnType<typeof P.songAttachments>>[number]['attachment']
  songTitle: string
  filename: string
}

// ── Download one file ────────────────────────────────────────────────────────

/**
 * Is this file already on disk?
 *
 * When the name has no extension we cannot know what it will be called until
 * the response arrives, so any `<base>.<ext>` counts as the same file. Without
 * this, an extension-less attachment would be re-downloaded on every run.
 */
function existingFile(destDir: string, filename: string): string | null {
  if (A.hasExtension(filename)) {
    const p = join(destDir, filename)
    return existsSync(p) && statSync(p).size > 0 ? p : null
  }
  if (!existsSync(destDir)) return null

  const base = filename.toLowerCase()
  for (const entry of readdirSync(destDir)) {
    const [stem] = splitExtension(entry)
    if (stem.toLowerCase() !== base) continue
    const p = join(destDir, entry)
    if (statSync(p).size > 0) return p
  }
  return null
}

/**
 * Download to `destDir/filename`, settling the extension from the response when
 * the name arrived without one. Returns the path actually written.
 */
async function fetchTo(
  url: string,
  destDir: string,
  filename: string,
): Promise<{ path: string; bytes: number }> {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} ${res.statusText}`)

  // Last line of defence. A signed URL that serves a web page means the
  // "attachment" was a view, not a file — this is exactly how two 149 KB HTML
  // pages once got written into the archive named as chord charts. No chart is
  // ever HTML, so refuse rather than write something that looks right in a
  // directory listing and is useless when opened.
  const responseType = String(res.headers.get('content-type') ?? '').toLowerCase()
  if (responseType.includes('text/html')) {
    throw new Error('server returned a web page, not a file — skipped')
  }

  // For names PCO could not type, ask the bytes what they are.
  let finalName = filename
  if (!A.hasExtension(finalName)) {
    finalName += A.extensionForContentType(res.headers.get('content-type'))
  }

  const dest = join(destDir, finalName)
  mkdirSync(destDir, { recursive: true })
  const partial = dest + cfg.PARTIAL_SUFFIX

  await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), createWriteStream(partial))

  const size = statSync(partial).size
  if (size === 0) throw new Error('empty file')

  renameSync(partial, dest) // atomic: a .part is never mistaken for a finished file
  return { path: dest, bytes: size }
}

// ─────────────────────────────────────────────────────────────────────────────

console.log(bold('\nWorship song downloader'))
console.log(dim(DRY ? 'DRY RUN — nothing will be written.\n' : 'Writing into the leader archive.\n'))

const folders = L.listLeaderFolders(cfg.LEADERS_ROOT, cfg.NON_PERSON_FOLDERS)
if (folders.length === 0) {
  console.log(red(`  Archive root not found or empty: ${cfg.LEADERS_ROOT}`))
  console.log(dim('  Check LEADERS_ROOT in wl_songs_scraper/config.ts\n'))
  process.exit(1)
}
const overrides = L.loadOverrides(resolve(ROOT, cfg.MAPPING_FILE))

const plans = await selectPlans()
if (plans.length === 0) {
  console.log(yellow('  No plan matched that selection.\n'))
  process.exit(0)
}
console.log(dim(`  ${plans.length} plan(s) selected\n`))

for (const plan of plans) {
  const leaders = await P.planLeaders(plan, cfg.WORSHIP_LEADER_POSITION, onWarn)

  console.log(bold(`${plan.date}  ${plan.serviceTypeName}`) + dim(`  plan ${plan.planId}`))

  if (leaders.length === 0) {
    console.log(`  ${yellow('skipped')} — no worship leader scheduled\n`)
    continue
  }

  // Resolve every leader to a folder BEFORE downloading anything, so a plan is
  // either filed correctly for everyone on it or reported and left alone.
  const targets: { name: string; folder: string }[] = []
  for (const name of leaders) {
    const m = L.matchFolder(name, folders, overrides)
    if (L.isTrusted(m)) {
      targets.push({ name, folder: m.folder! })
    } else {
      const dates = skippedLeaders.get(name) ?? []
      dates.push(plan.date)
      skippedLeaders.set(name, dates)
      console.log(
        `  ${yellow('skipped')} ${name} — ${
          m.folder ? `only a "${m.confidence}" match (${m.folder})` : 'no folder matched'
        }`,
      )
    }
  }
  if (targets.length === 0) {
    console.log()
    continue
  }

  const songs = await P.planSongs(plan, onWarn)

  // A future Sunday often exists as a shell with the team scheduled but no
  // songs chosen yet. That is not an error and not something to retry against
  // — it just means the plan is not built. Say so plainly.
  if (songs.length === 0) {
    stats.notReady++
    console.log(`  ${yellow('nothing to do')} — plan has no songs yet (not built)\n`)
    continue
  }

  stats.plans++
  stats.songs += songs.length
  console.log(dim(`  ${leaders.join(' + ')} — ${songs.length} song(s)`))

  // Collect the whole plan's files BEFORE writing any of them. Two reasons:
  // name collisions can only be resolved with the full list in hand, and a
  // two-leader plan then costs one pass over the API instead of two.
  const pending: Pending[] = []
  for (const song of songs) {
    const attachments = await P.songAttachments(song, onWarn)
    let fileCount = 0

    for (const { attachment } of attachments) {
      if (!A.isDownloadableFile(attachment)) {
        stats.links++ // YouTube and the like: no bytes of their own.
        continue
      }
      fileCount++
      pending.push({
        attachment,
        songTitle: song.title,
        filename: safeSegment(A.attachmentFilename(attachment)),
      })
    }
    if (fileCount === 0) {
      stats.noSongFiles++
      console.log(dim(`      ${song.title} — no files attached`))
    }
  }

  const renamed = resolveCollisions(pending)
  if (renamed.length) {
    console.log(dim(`  ${renamed.length} name collision(s) resolved with the song title`))
  }

  for (const t of targets) {
    const dest = planFolder(cfg.LEADERS_ROOT, t.folder, plan.date)
    console.log(`  ${dim('→')} ${dest}`)

    for (const item of pending) {
      if (!FORCE && existingFile(dest, item.filename)) {
        stats.skippedExisting++
        continue
      }

      const unknownExt = !A.hasExtension(item.filename)

      if (DRY) {
        const size = item.attachment.attributes?.file_size
        console.log(
          `      ${dim('+')} ${item.filename}${unknownExt ? dim('.<from response>') : ''}` +
            (size ? dim(`  ${size} bytes`) : ''),
        )
        stats.downloaded++
        continue
      }

      try {
        const url = await A.resolveDownloadUrl(item.attachment)
        if (!url) {
          console.log(`      ${red('✗')} ${item.filename} — no download URL`)
          stats.failed++
          continue
        }
        const { path, bytes } = await fetchTo(url, dest, item.filename)
        stats.downloaded++
        stats.bytes += bytes
        console.log(`      ${green('↓')} ${basename(path)} ${dim(`${(bytes / 1024).toFixed(0)} KB`)}`)
      } catch (err) {
        stats.failed++
        console.log(`      ${red('✗')} ${item.filename} — ${err instanceof Error ? err.message : err}`)
      }
    }
  }
  console.log()
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(bold('Summary'))
console.log(`  plans filed        ${stats.plans}`)
console.log(`  songs              ${stats.songs}`)
console.log(`  files ${DRY ? 'to download ' : 'downloaded  '} ${stats.downloaded}${
  stats.bytes ? dim(`  (${(stats.bytes / 1024 / 1024).toFixed(1)} MB)`) : ''
}`)
console.log(`  already present    ${stats.skippedExisting}`)
if (stats.notReady) console.log(`  plans not built    ${stats.notReady}${dim('  — no songs chosen yet')}`)
if (stats.noSongFiles) console.log(`  songs with no file ${stats.noSongFiles}`)
if (stats.links) console.log(`  links (not files)  ${stats.links}${dim('  — YouTube etc., skipped')}`)
if (stats.failed) console.log(red(`  failed             ${stats.failed}`))

if (skippedLeaders.size) {
  console.log(`\n${yellow('Leaders skipped — add them to wl_songs_scraper/mapping.json:')}`)
  for (const [name, dates] of skippedLeaders) {
    console.log(`  "${name}": ""${dim(`   ${dates.length} plan(s): ${dates.join(', ')}`)}`)
  }
}

if (warnings.length) {
  console.log(dim(`\n${warnings.length} API warning(s):`))
  for (const w of [...new Set(warnings)].slice(0, 10)) console.log(dim(`  ${w}`))
}

console.log()
