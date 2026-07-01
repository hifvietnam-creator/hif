/**
 * scripts/yt-sync-media.ts
 *
 * Fetches the latest video from announcement + testimony playlists
 * and updates the MediaHighlights global via Payload local API.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/yt-sync-media.ts
 *
 * Requires: YOUTUBE_API_KEY + DATABASE_URL + PAYLOAD_SECRET in .env
 * To add worship: fill in WORSHIP_PLAYLIST below.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Playlist config ───────────────────────────────────────────────────────────
const ANNOUNCEMENT_PLAYLIST = 'PL7A2w2jsUkUnKuNaSQdLwu_DGFBzFxeWu'
const TESTIMONY_PLAYLISTS = [
  'PL7A2w2jsUkUl4FHTOdR1u3Gtz6y7bC_BE',
  'PL7A2w2jsUkUnk84vYR31iTwX-tmmVHXMz',
]
const WORSHIP_PLAYLIST = '' // Add your worship playlist ID when available

// ── Load .env ─────────────────────────────────────────────────────────────────
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

// ── YouTube helpers ───────────────────────────────────────────────────────────
interface VideoInfo {
  videoId: string
  title: string
  publishedAt: string | null
}

async function getLatestFromPlaylist(playlistId: string, apiKey: string): Promise<VideoInfo | null> {
  const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('playlistId', playlistId)
  url.searchParams.set('maxResults', '10')

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`YouTube API error ${res.status}`)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = await res.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valid = (data.items ?? []).filter((item: any) =>
    item.snippet.title !== 'Deleted video' &&
    item.snippet.title !== 'Private video' &&
    item.snippet.resourceId?.videoId,
  )
  if (valid.length === 0) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item = valid[0] as any
  return {
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt?.split('T')[0] ?? null,
  }
}

async function getMostRecent(playlistIds: string[], apiKey: string): Promise<VideoInfo | null> {
  const results = await Promise.allSettled(playlistIds.map((id) => getLatestFromPlaylist(id, apiKey)))
  const valid = results
    .filter((r): r is PromiseFulfilledResult<VideoInfo | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is VideoInfo => v !== null)
  if (valid.length === 0) return null
  valid.sort((a, b) => (!a.publishedAt ? 1 : !b.publishedAt ? -1 : b.publishedAt.localeCompare(a.publishedAt)))
  return valid[0]
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Load env FIRST, then dynamically import config
  loadEnv()

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.error('❌  YOUTUBE_API_KEY not set in .env')
    process.exit(1)
  }

  // 2. Dynamic config import AFTER env is loaded
  const { default: config } = await import('@payload-config')

  console.log('📡  Fetching latest videos from YouTube...\n')

  const [annResult, testResult, worResult] = await Promise.allSettled([
    getLatestFromPlaylist(ANNOUNCEMENT_PLAYLIST, apiKey),
    getMostRecent(TESTIMONY_PLAYLISTS, apiKey),
    WORSHIP_PLAYLIST ? getLatestFromPlaylist(WORSHIP_PLAYLIST, apiKey) : Promise.resolve(null),
  ])

  const ann = annResult.status === 'fulfilled' ? annResult.value : null
  const test = testResult.status === 'fulfilled' ? testResult.value : null
  const wor = worResult.status === 'fulfilled' ? worResult.value : null

  if (annResult.status === 'rejected') console.error('⚠️  Announcement:', (annResult.reason as Error).message)
  if (testResult.status === 'rejected') console.error('⚠️  Testimony:', (testResult.reason as Error).message)

  console.log('📢  Announcement:', ann ? `"${ann.title}" (${ann.videoId})` : 'none')
  console.log('🙏  Testimony:   ', test ? `"${test.title}" (${test.videoId})` : 'none')
  console.log('🎵  Worship:     ', wor ? `"${wor.title}"` : WORSHIP_PLAYLIST ? 'none' : 'no playlist set')

  if (!ann && !test && !wor) {
    console.log('\nℹ️  Nothing to update.')
    process.exit(0)
  }

  console.log('\n🔌  Connecting to Payload...')
  const payload = await getPayload({ config })
  console.log('✅  Connected.\n')

  const updateData: Record<string, unknown> = {}
  if (ann) updateData.announcement = { videoId: ann.videoId, title: ann.title, publishedAt: ann.publishedAt }
  if (test) updateData.testimony = { videoId: test.videoId, title: test.title, publishedAt: test.publishedAt }
  if (wor) updateData.worship = { videoId: wor.videoId, title: wor.title, publishedAt: wor.publishedAt }

  await payload.updateGlobal({ slug: 'media-highlights', data: updateData, overrideAccess: true })
  console.log('✅  MediaHighlights updated.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
