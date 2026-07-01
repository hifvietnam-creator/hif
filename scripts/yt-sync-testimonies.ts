/**
 * scripts/yt-sync-testimonies.ts
 *
 * Fetches videos from two HIF YouTube playlists and upserts them
 * into the Payload `testimonies` collection as video testimonies.
 *
 * Playlists:
 *   - Baptism Testimonies: PL7A2w2jsUkUnk84vYR31iTwX-tmmVHXMz
 *   - Advent Candle Lighting: PL7A2w2jsUkUl4FHTOdR1u3Gtz6y7bC_BE
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/yt-sync-testimonies.ts
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

// Playlists to sync
const PLAYLISTS: Array<{ id: string; category: 'baptism' | 'advent-candle' }> = [
  { id: 'PL7A2w2jsUkUnk84vYR31iTwX-tmmVHXMz', category: 'baptism' },
  { id: 'PL7A2w2jsUkUl4FHTOdR1u3Gtz6y7bC_BE', category: 'advent-candle' },
]

interface YTPlaylistItem {
  snippet: {
    title: string
    publishedAt: string
    resourceId: { videoId: string }
    description: string
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

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?${params}`,
    )

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`YouTube API error: ${res.status} — ${err}`)
    }

    const json = (await res.json()) as YTPlaylistResponse
    videos.push(...json.items)

    if (!json.nextPageToken) break
    pageToken = json.nextPageToken
  }

  return videos
}

async function main() {
  loadEnv()

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY?.trim()
  if (!YOUTUBE_API_KEY) {
    throw new Error('YOUTUBE_API_KEY must be set in .env')
  }

  const { default: config } = await import('@payload-config')
  const { getPayload } = await import('payload')
  const payload = await getPayload({ config })

  let upserted = 0
  let skipped = 0

  for (const { id: playlistId, category } of PLAYLISTS) {
    console.log(`\n[YT Testimonies] Fetching playlist: ${playlistId} (${category})`)
    const videos = await fetchPlaylistVideos(playlistId, YOUTUBE_API_KEY)
    console.log(`[YT Testimonies] Found ${videos.length} videos`)

    for (const item of videos) {
      const { title, publishedAt, resourceId, description } = item.snippet
      const youtubeId = resourceId.videoId

      // Skip "Deleted video" or "Private video" entries
      if (title === 'Deleted video' || title === 'Private video') {
        console.log(`[SKIP] "${title}"`)
        skipped++
        continue
      }

      const data = {
        name: title,
        youtubeId,
        publishedAt: new Date(publishedAt).toISOString(),
        category,
        source: 'youtube' as const,
        videoFeatured: true,
        featured: false,
        // Use description as quote if short enough (some videos have text intros)
        quote: description && description.length > 0 && description.length < 500
          ? description
          : undefined,
      }

      // Upsert by youtubeId
      const existing = await payload.find({
        collection: 'testimonies',
        where: { youtubeId: { equals: youtubeId } },
        limit: 1,
        overrideAccess: true,
      })

      if (existing.docs.length > 0) {
        await payload.update({
          collection: 'testimonies',
          id: existing.docs[0]!.id,
          data,
          overrideAccess: true,
        })
        console.log(`[UPDATE] ${category} — "${title}"`)
      } else {
        await payload.create({
          collection: 'testimonies',
          data: { ...data, _status: 'published' },
          overrideAccess: true,
        })
        console.log(`[CREATE] ${category} — "${title}"`)
      }
      upserted++
    }
  }

  console.log(`\n[YT Testimonies] Done. ${upserted} upserted, ${skipped} skipped.\n`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[YT Testimonies] Error:', err)
  process.exit(1)
})
