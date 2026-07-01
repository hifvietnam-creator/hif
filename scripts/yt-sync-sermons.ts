/**
 * scripts/yt-sync-sermons.ts
 *
 * All-in-one sermon sync: reads every Series in Payload that has a
 * `youtubePlaylistId`, fetches the YouTube playlist, and upserts each
 * video as a published Sermon — without touching manually-set fields
 * (speaker, PDF, discussion questions, scripture, slug).
 *
 * This replaces the two-step  yt-fetch-sermons.mjs → yt-import-sermons.ts
 * flow for ongoing syncs. Run it any time to pick up the latest sermons.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/yt-sync-sermons.ts
 *
 * Requires .env:
 *   YOUTUBE_API_KEY=...
 *   DATABASE_URL=...
 *   PAYLOAD_SECRET=...
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

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
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {}
}

// ── YouTube API helpers ────────────────────────────────────────────────────────

interface YTPlaylistItem {
  snippet: {
    title: string
    description: string
    publishedAt: string
    resourceId: { videoId: string }
  }
}

interface YTPlaylistResponse {
  items: YTPlaylistItem[]
  nextPageToken?: string
}

async function fetchPlaylistVideos(
  playlistId: string,
  apiKey: string,
): Promise<YTPlaylistItem[]> {
  const videos: YTPlaylistItem[] = []
  let pageToken: string | undefined

  while (true) {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
      key: apiKey,
      ...(pageToken ? { pageToken } : {}),
    })

    const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?${params}`)
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`YouTube API error ${res.status}: ${err}`)
    }

    const json = (await res.json()) as YTPlaylistResponse
    videos.push(...json.items)
    if (!json.nextPageToken) break
    pageToken = json.nextPageToken
  }

  return videos
}

function extractDateFromSnippet(publishedAt: string, description: string): string {
  // Try to find a date in the description (e.g. "4 May 2025" or "May 4, 2025")
  const descDate = description.match(
    /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i,
  )
  if (descDate) {
    const d = new Date(`${descDate[2]} ${descDate[1]}, ${descDate[3]}`)
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  // Fallback: use YouTube publishedAt date
  return new Date(publishedAt).toISOString().slice(0, 10)
}

// ── Slug helpers ───────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

async function uniqueSlug(
  payload: Awaited<ReturnType<typeof import('payload').getPayload>>,
  base: string,
): Promise<string> {
  let slug = slugify(base)
  let attempt = 0
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`
    const existing = await payload.find({
      collection: 'sermons',
      where: { slug: { equals: candidate } },
      limit: 1,
      overrideAccess: true,
    })
    if (existing.docs.length === 0) return candidate
    attempt++
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  loadEnv()

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY?.trim()
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY must be set in .env')

  const { default: config } = await import('@payload-config')
  const { getPayload } = await import('payload')
  const payload = await getPayload({ config })

  // 1. Find all Series with a YouTube playlist ID
  const seriesRes = await payload.find({
    collection: 'series',
    where: { youtubePlaylistId: { exists: true } },
    limit: 100,
    overrideAccess: true,
  })

  const seriesList = seriesRes.docs.filter((s) => s.youtubePlaylistId)
  console.log(`\n[Sermon Sync] Found ${seriesList.length} series with YouTube playlists.\n`)

  let totalCreated = 0
  let totalUpdated = 0
  let totalSkipped = 0

  for (const series of seriesList) {
    const playlistId = series.youtubePlaylistId as string
    const seriesTitle = series.title as string
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`

    console.log(`\n📋  Series: "${seriesTitle}"`)
    console.log(`    Playlist: ${playlistUrl}`)

    let videos: YTPlaylistItem[]
    try {
      videos = await fetchPlaylistVideos(playlistId, YOUTUBE_API_KEY)
    } catch (err) {
      console.error(`    ❌  Failed to fetch playlist: ${(err as Error).message}`)
      continue
    }

    // Filter out deleted/private videos
    const validVideos = videos.filter(
      (v) => v.snippet.title !== 'Deleted video' && v.snippet.title !== 'Private video',
    )
    console.log(`    ${validVideos.length} videos (${videos.length - validVideos.length} hidden)`)

    for (const video of validVideos) {
      const { title, description, publishedAt, resourceId } = video.snippet
      const youtubeURL = `https://www.youtube.com/watch?v=${resourceId.videoId}`
      const date = extractDateFromSnippet(publishedAt, description)

      // Check if sermon already exists by youtubeURL
      const existing = await payload.find({
        collection: 'sermons',
        where: { youtubeURL: { equals: youtubeURL } },
        limit: 1,
        overrideAccess: true,
      })

      if (existing.docs.length > 0) {
        // Update non-manual fields only (preserve speaker, PDF, DQ, scripture, slug)
        await payload.update({
          collection: 'sermons',
          id: existing.docs[0]!.id,
          data: {
            title,
            date,
            series: series.id,
            _status: 'published',
            // Only set description if not already set
            ...(!existing.docs[0]!.description && description.trim()
              ? { description: description.slice(0, 500) }
              : {}),
          },
          overrideAccess: true,
        })
        totalUpdated++
        console.log(`    🔄  Updated:  "${title}"`)
      } else {
        // New sermon — create with slug
        const slug = await uniqueSlug(payload, title)
        await payload.create({
          collection: 'sermons',
          data: {
            title,
            youtubeURL,
            date,
            series: series.id,
            description: description.trim() ? description.slice(0, 500) : undefined,
            slug,
            _status: 'published',
          },
          overrideAccess: true,
        })
        totalCreated++
        console.log(`    ✅  Created:  "${title}"`)
      }
    }

    // Ensure the Series itself is published
    if ((series._status as string | undefined) !== 'published') {
      await payload.update({
        collection: 'series',
        id: series.id,
        data: { _status: 'published' },
        overrideAccess: true,
      })
    }
  }

  console.log(`\n🎉  Done! ${totalCreated} created, ${totalUpdated} updated, ${totalSkipped} skipped.\n`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[Sermon Sync] Error:', err)
  process.exit(1)
})
