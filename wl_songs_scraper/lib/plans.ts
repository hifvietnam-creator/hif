/**
 * wl_songs_scraper/lib/plans.ts
 *
 * Reading plans, their worship leaders, and their song files out of PCO.
 * All reads go through the project's read-only client.
 *
 * Two things here were learned from the live account rather than the docs, and
 * both contradict the obvious guess:
 *
 *   1. `/services/v2/team_positions` returned nothing matching "Worship
 *      Leader". The position name that actually exists is `team_position_name`
 *      on a plan's team_members. So leaders are found per plan, not by looking
 *      up a position first.
 *
 *   2. Plan items do NOT carry `item_type === 'song'` — a plan with 31 items
 *      reported zero of them. What items do carry is a `song` relationship. So
 *      "is this a song?" is answered by the relationship, never by item_type.
 */

import { get } from '../../src/lib/pco'

export type Rec = {
  id: string
  type: string
  attributes?: Record<string, unknown>
  relationships?: Record<string, { data?: { id: string; type: string } | null }>
}
type Many = { data: Rec[]; meta?: { total_count?: number; next?: { offset: number } } }

export const rel = (r: Rec | undefined, name: string): string | null =>
  r?.relationships?.[name]?.data?.id ?? null

export const attr = <T = unknown,>(r: Rec | undefined, name: string): T | undefined =>
  r?.attributes?.[name] as T | undefined

/** GET a collection, following pagination. Returns [] on 404 rather than throwing. */
export async function getAll(path: string, onWarn?: (m: string) => void): Promise<Rec[]> {
  const out: Rec[] = []
  let offset = 0
  for (;;) {
    const sep = path.includes('?') ? '&' : '?'
    try {
      const page = await get<Many>(`${path}${sep}per_page=100&offset=${offset}`)
      out.push(...(Array.isArray(page.data) ? page.data : []))
      if (!page.meta?.next) return out
      offset = page.meta.next.offset
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('404') && onWarn) onWarn(`${path} → ${msg.slice(0, 120)}`)
      return out
    }
  }
}

// ── Plans ────────────────────────────────────────────────────────────────────

export type Plan = {
  serviceTypeId: string
  serviceTypeName: string
  planId: string
  /** YYYY-MM-DD, taken from sort_date. This is what drives the folder name. */
  date: string
  title: string
}

/** The plan's date as YYYY-MM-DD, or null when PCO gives us nothing usable. */
export function planDate(p: Rec): string | null {
  const raw = String(attr<string>(p, 'sort_date') ?? '')
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(raw)
  return m ? m[1]! : null
}

export async function listPlans(
  serviceTypeId: string,
  serviceTypeName: string,
  opts: { since?: string; until?: string } = {},
  onWarn?: (m: string) => void,
): Promise<Plan[]> {
  const raw = await getAll(`/services/v2/service_types/${serviceTypeId}/plans?order=sort_date`, onWarn)
  const out: Plan[] = []
  for (const p of raw) {
    const date = planDate(p)
    if (!date) continue
    if (opts.since && date < opts.since) continue
    if (opts.until && date > opts.until) continue
    out.push({
      serviceTypeId,
      serviceTypeName,
      planId: p.id,
      date,
      title: attr<string>(p, 'title') ?? attr<string>(p, 'dates') ?? '',
    })
  }
  return out
}

// ── Who led ──────────────────────────────────────────────────────────────────

/**
 * Names scheduled in the given position on a plan.
 *
 * Matched on `team_position_name`, case- and punctuation-insensitively, since
 * that is the only place the position name reliably appears.
 */
export async function planLeaders(
  plan: Plan,
  positionName: string,
  onWarn?: (m: string) => void,
): Promise<string[]> {
  const members = await getAll(
    `/services/v2/service_types/${plan.serviceTypeId}/plans/${plan.planId}/team_members`,
    onWarn,
  )
  const want = positionName.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
  const names = members
    .filter((m) => {
      const pos = String(attr<string>(m, 'team_position_name') ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
      return pos === want
    })
    .map((m) => String(attr<string>(m, 'name') ?? '').trim())
    .filter(Boolean)

  return [...new Set(names)]
}

// ── Songs and their files ────────────────────────────────────────────────────

export type PlanSong = {
  itemId: string
  title: string
  songId: string
  arrangementId: string | null
  /** The key this plan uses, when PCO records one. Informational only — we take every file. */
  keyName: string | null
  sequence: number | null
}

/**
 * Songs in a plan, in running order.
 *
 * Identified by the presence of a `song` relationship, because `item_type` does
 * not say "song" on this account.
 */
export async function planSongs(plan: Plan, onWarn?: (m: string) => void): Promise<PlanSong[]> {
  const items = await getAll(
    `/services/v2/service_types/${plan.serviceTypeId}/plans/${plan.planId}/items`,
    onWarn,
  )

  const songs: PlanSong[] = []
  for (const item of items) {
    const songId = rel(item, 'song')
    if (!songId) continue
    songs.push({
      itemId: item.id,
      title: String(attr<string>(item, 'title') ?? '(untitled)'),
      songId,
      arrangementId: rel(item, 'arrangement'),
      keyName: attr<string>(item, 'key_name') ?? null,
      sequence: attr<number>(item, 'sequence') ?? null,
    })
  }
  return songs.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
}

export type SongAttachment = {
  attachment: Rec
  /** Where it hung: the arrangement used this Sunday, or the song's own library files. */
  origin: 'arrangement' | 'song'
  songTitle: string
}

/**
 * Every attachment for one song: the arrangement's files plus the song-level
 * files. Both are taken, per the brief — all keys, lyrics sheets included.
 *
 * De-duplicated by attachment id, since an attachment can be reachable by more
 * than one route.
 */
export async function songAttachments(
  song: PlanSong,
  onWarn?: (m: string) => void,
): Promise<SongAttachment[]> {
  const seen = new Set<string>()
  const out: SongAttachment[] = []

  if (song.arrangementId) {
    const arr = await getAll(
      `/services/v2/songs/${song.songId}/arrangements/${song.arrangementId}/attachments`,
      onWarn,
    )
    for (const a of arr) {
      if (seen.has(a.id)) continue
      seen.add(a.id)
      out.push({ attachment: a, origin: 'arrangement', songTitle: song.title })
    }
  }

  const songLevel = await getAll(`/services/v2/songs/${song.songId}/attachments`, onWarn)
  for (const a of songLevel) {
    if (seen.has(a.id)) continue
    seen.add(a.id)
    out.push({ attachment: a, origin: 'song', songTitle: song.title })
  }

  return out
}
