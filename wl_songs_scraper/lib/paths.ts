/**
 * wl_songs_scraper/lib/paths.ts
 *
 * Where a plan's files belong on disk.
 *
 * The archive's history uses at least four different conventions — month
 * folders that are sometimes SEPTEMBER and sometimes September, date folders
 * written as "September 06", "07 September 2025", "October 12 2025" and
 * "27 July", and a depth that varies between two and four levels. Manual filing
 * also produced a February service under JANUARY and a folder called
 * "5 Julyy 2022".
 *
 * None of that is reproducible, so this module implements exactly one
 * convention, matching the most recent 2026 practice:
 *
 *     <Leader>\<YYYY>\<MONTH>\<Month DD>\
 *     Lovella\2026\SEPTEMBER\September 06\
 *
 * Existing folders are never renamed or touched. Normalising the back
 * catalogue is a separate job.
 */

import { join } from 'path'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

/** Characters Windows forbids in a path segment, plus control codes. */
// eslint-disable-next-line no-control-regex
const ILLEGAL = /[<>:"/\\|?*\u0000-\u001f]/g

/** Windows reserves these names regardless of extension. */
const RESERVED = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`),
])

/**
 * Make a string safe as a single path segment on Windows.
 *
 * Trailing dots and spaces are stripped, because Windows silently drops them
 * when creating the file — which would make the "do we already have this?"
 * check miss on every subsequent run and re-download the file forever.
 */
export function safeSegment(input: string, fallback = 'untitled'): string {
  let s = String(input ?? '')
    .replace(ILLEGAL, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')

  if (RESERVED.has(s.toUpperCase())) s = `_${s}`

  if (s.length > 150) {
    // Preserve the extension when truncating a long filename.
    const dot = s.lastIndexOf('.')
    s =
      dot > 0 && s.length - dot <= 8
        ? s.slice(0, 150 - (s.length - dot)) + s.slice(dot)
        : s.slice(0, 150)
  }

  return s || fallback
}

export type PlanDateParts = { year: string; monthFolder: string; dayFolder: string }

/**
 * Split a plan's date (YYYY-MM-DD…) into the three folder levels.
 *
 * Throws rather than guessing. A wrong date files a service under the wrong
 * month, which has already happened by hand in this archive and is precisely
 * the failure this script exists to stop.
 */
export function planDateParts(isoDate: string): PlanDateParts {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(isoDate))
  if (!m) throw new Error(`Unparseable plan date: ${JSON.stringify(isoDate)}`)

  const [, year, month, day] = m
  const monthName = MONTHS[parseInt(month!, 10) - 1]
  if (!monthName) throw new Error(`Bad month in plan date: ${isoDate}`)

  return {
    year: year!,
    monthFolder: monthName.toUpperCase(), // SEPTEMBER
    dayFolder: `${monthName} ${day}`, //     September 06
  }
}

/** Full destination directory for one plan in one leader's archive. */
export function planFolder(leadersRoot: string, leaderFolder: string, isoDate: string): string {
  const { year, monthFolder, dayFolder } = planDateParts(isoDate)
  return join(leadersRoot, safeSegment(leaderFolder), year, monthFolder, dayFolder)
}

// ── Name collisions within one plan ──────────────────────────────────────────

/** Split "Song-chords-D.pdf" into ["Song-chords-D", ".pdf"]. */
export function splitExtension(name: string): [string, string] {
  const m = /^(.*)(\.[A-Za-z0-9]{1,8})$/.exec(name)
  return m ? [m[1]!, m[2]!] : [name, '']
}

export type NamedFile = { songTitle: string; filename: string }

/**
 * Make every filename in one plan unique, mutating `items` in place.
 *
 * This is not hypothetical. PCO's generated chord sheets all arrive named
 * `viewchordsheet`, so a single six-song plan produced two files with identical
 * names — and the second would have silently overwritten the first, leaving one
 * song's chord sheet missing with nothing on disk to show it had ever existed.
 *
 * Duplicates are disambiguated by the song they belong to, which is unique in
 * practice and far more useful than "viewchordsheet (2)". A numeric suffix is
 * the fallback if even that is not enough.
 *
 * Returns a description of each rename, for reporting.
 */
export function resolveCollisions(items: NamedFile[]): string[] {
  const changed: string[] = []

  const byName = new Map<string, NamedFile[]>()
  for (const it of items) {
    const key = it.filename.toLowerCase()
    byName.set(key, [...(byName.get(key) ?? []), it])
  }

  for (const group of byName.values()) {
    if (group.length < 2) continue
    for (const it of group) {
      const [stem, ext] = splitExtension(it.filename)
      const next = safeSegment(`${it.songTitle} - ${stem}${ext}`)
      changed.push(`${it.filename} → ${next}`)
      it.filename = next
    }
  }

  // Anything still duplicated — two songs sharing a title, say — gets a number.
  const used = new Set<string>()
  for (const it of items) {
    const [stem, ext] = splitExtension(it.filename)
    let candidate = it.filename
    let n = 2
    while (used.has(candidate.toLowerCase())) candidate = `${stem} (${n++})${ext}`
    if (candidate !== it.filename) changed.push(`${it.filename} → ${candidate}`)
    used.add(candidate.toLowerCase())
    it.filename = candidate
  }

  return changed
}
