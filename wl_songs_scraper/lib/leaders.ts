/**
 * wl_songs_scraper/lib/leaders.ts
 *
 * Mapping a Planning Center person to their folder in the archive.
 *
 * There is no rule that derives one from the other. PCO says
 * "Lovella Blanila- Dacles" (with a stray space before the hyphen); the folder
 * says "Lovella". PCO says "Ngoc Pearl Ngo"; the folder says "Pearl". So the
 * matcher proposes and `mapping.json` decides — an explicit override always
 * wins, and anything the matcher cannot settle unambiguously is reported for a
 * human rather than guessed.
 *
 * That bias is deliberate: filing a leader's songs into someone else's folder
 * is worse than not filing them at all, because nobody notices until the wrong
 * person turns up on Sunday with the wrong charts.
 */

import { readFileSync, existsSync, readdirSync } from 'fs'

/** Lowercase, strip accents, collapse punctuation and whitespace. */
export function norm(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export const tokens = (s: string) => norm(s).split(' ').filter(Boolean)

export type Confidence = 'override' | 'exact' | 'prefix' | 'token' | 'none'

export type Match = {
  pcoName: string
  folder: string | null
  confidence: Confidence
  alternatives: string[]
}

/** Folder names directly under the archive root that are not people. */
export function listLeaderFolders(root: string, exclude: string[] = []): string[] {
  if (!existsSync(root)) return []
  const skip = new Set(exclude.map(norm))
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((n) => !skip.has(norm(n)))
}

/** Load `mapping.json`: { "PCO full name": "Folder name" }. Missing file is fine. */
export function loadOverrides(path: string): Record<string, string> {
  if (!existsSync(path)) return {}
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (k.startsWith('//') || k === '$schema') continue // comment keys
      if (typeof v === 'string' && v.trim()) out[norm(k)] = v.trim()
    }
    return out
  } catch (err) {
    throw new Error(`mapping.json is not valid JSON: ${err instanceof Error ? err.message : err}`)
  }
}

/**
 * Resolve one PCO name to a folder.
 *
 * Order: explicit override → exact name → folder is the leading part of the
 * PCO name → any shared token. Ties never resolve; they are returned as
 * `alternatives` for a person to settle in mapping.json.
 */
export function matchFolder(
  pcoName: string,
  folders: string[],
  overrides: Record<string, string> = {},
): Match {
  const override = overrides[norm(pcoName)]
  if (override) return { pcoName, folder: override, confidence: 'override', alternatives: [] }

  const pTok = tokens(pcoName)
  const pNorm = pTok.join(' ')

  const exact = folders.filter((f) => norm(f) === pNorm)
  if (exact.length === 1) return { pcoName, folder: exact[0]!, confidence: 'exact', alternatives: [] }

  // "Lovella" is the leading part of "Lovella Blanila Dacles".
  const prefix = folders.filter((f) => {
    const fTok = tokens(f)
    return fTok.length > 0 && fTok.every((t, i) => pTok[i] === t)
  })
  if (prefix.length === 1) return { pcoName, folder: prefix[0]!, confidence: 'prefix', alternatives: [] }
  if (prefix.length > 1) return { pcoName, folder: null, confidence: 'none', alternatives: prefix }

  // "Pearl" shares a token with "Ngoc Pearl Ngo".
  const shared = folders.filter((f) => tokens(f).some((t) => pTok.includes(t)))
  if (shared.length === 1) return { pcoName, folder: shared[0]!, confidence: 'token', alternatives: [] }
  if (shared.length > 1) return { pcoName, folder: null, confidence: 'none', alternatives: shared }

  return { pcoName, folder: null, confidence: 'none', alternatives: [] }
}

// ── Suggestions for names the matcher will not settle ────────────────────────

/** Levenshtein distance, capped in practice by the short strings involved. */
function distance(a: string, b: string): number {
  if (a === b) return 0
  const prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]!
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]!
      prev[j] = Math.min(
        prev[j]! + 1,
        prev[j - 1]! + 1,
        diag + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
      diag = tmp
    }
  }
  return prev[b.length]!
}

/** 0…1 similarity between two strings. */
const ratio = (a: string, b: string): number =>
  a.length === 0 && b.length === 0 ? 1 : 1 - distance(a, b) / Math.max(a.length, b.length)

/**
 * Folders that look like they might belong to this person, best first.
 *
 * These are hints for a human to confirm in mapping.json, never used to file
 * anything. Catches the cases the strict matcher cannot: a folder spelled
 * "Juliete" for "Juliette Ellazo", "Michael W" for "Michael Walls", "Tomi"
 * inside "Oluwatomisin".
 */
export function suggest(pcoName: string, folders: string[], limit = 3): string[] {
  const pTok = tokens(pcoName)
  const pJoined = pTok.join('')

  const scored = folders.map((folder) => {
    const fTok = tokens(folder)
    const fJoined = fTok.join('')
    let best = 0

    for (const ft of fTok) {
      for (const pt of pTok) {
        best = Math.max(best, ratio(ft, pt))
        // "Michael W" ⊂ "Michael Walls", "Tomi" ⊂ "Oluwatomisin"
        if (ft.length >= 3 && pt.startsWith(ft)) best = Math.max(best, 0.9)
        if (ft.length >= 4 && pt.includes(ft)) best = Math.max(best, 0.82)
      }
    }
    // "Marian" vs "Mary Ann" only looks close once the spaces are gone.
    best = Math.max(best, ratio(fJoined, pJoined))
    return { folder, score: best }
  })

  return scored
    .filter((s) => s.score >= 0.72)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.folder)
}

/**
 * Confidence levels the downloader will act on without asking.
 *
 * `token` is excluded on purpose: a single shared first name is how two
 * different Sarahs end up sharing a folder. Promote those to `override` in
 * mapping.json once a human has confirmed them.
 */
export const TRUSTED: Confidence[] = ['override', 'exact', 'prefix']

export const isTrusted = (m: Match): boolean => m.folder !== null && TRUSTED.includes(m.confidence)
