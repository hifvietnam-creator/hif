/**
 * scripts/yt-fetch-sermons.mjs
 *
 * Fetches all sermon playlists from YouTube and writes data/sermons-review.json.
 * You then fill in the "speaker", "scripture", and "duration" fields before importing.
 *
 * Usage:
 *   node scripts/yt-fetch-sermons.mjs
 *
 * Requires YOUTUBE_API_KEY in .env (loaded automatically via dotenv).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Load env ──────────────────────────────────────────────────────────────────
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
  } catch {
    // .env not found — rely on actual environment variables
  }
}
loadEnv()

const API_KEY = process.env.YOUTUBE_API_KEY
if (!API_KEY) {
  console.error('❌  YOUTUBE_API_KEY not set in .env')
  process.exit(1)
}

// ── Sermon playlist config ────────────────────────────────────────────────────
// Each entry: { playlistId, seriesTitle }
// seriesTitle is pre-filled from the playlist name — the script will confirm it from YouTube.
const SERMON_PLAYLISTS = [
  { playlistId: 'PL7A2w2jsUkUnfdILCzO2v59OV-oHl-g2u', seriesTitle: 'Story of The Psalms' },
  { playlistId: 'PL7A2w2jsUkUlxre5RCq2RG_Wu_rxeWIwP', seriesTitle: 'PASS IT ON' },
  { playlistId: 'PL7A2w2jsUkUnNklbQTQSz1aGYSOJcif7Q', seriesTitle: 'THE KING HAS COME' },
  { playlistId: 'PL7A2w2jsUkUlRsSZV0iRX9GSC-znImYzA', seriesTitle: "Heaven's Favor" },
  { playlistId: 'PL7A2w2jsUkUnTXiqN-VYkV-_lU_jPDYF7', seriesTitle: 'Christmas 2025' },
]

// ── YouTube API helpers ───────────────────────────────────────────────────────
async function ytGet(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`)
  url.searchParams.set('key', API_KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`YouTube API error ${res.status}: ${await res.text()}`)
  return res.json()
}

async function fetchAllPlaylistItems(playlistId) {
  const items = []
  let pageToken = undefined

  do {
    const params = {
      part: 'snippet,contentDetails',
      playlistId,
      maxResults: 50,
    }
    if (pageToken) params.pageToken = pageToken

    const data = await ytGet('playlistItems', params)
    items.push(...data.items)
    pageToken = data.nextPageToken
  } while (pageToken)

  return items
}

async function fetchVideoDetails(videoIds) {
  // YouTube allows up to 50 IDs per request
  const details = {}
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50)
    const data = await ytGet('videos', {
      part: 'contentDetails,snippet',
      id: chunk.join(','),
    })
    for (const item of data.items) {
      details[item.id] = item
    }
  }
  return details
}

function parseDuration(iso) {
  // PT1H23M45S → "1 hr 23 min" or "45 min"
  if (!iso) return ''
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''
  const h = parseInt(match[1] || '0')
  const m = parseInt(match[2] || '0')
  if (h > 0) return `${h} hr ${m > 0 ? m + ' min' : ''}`.trim()
  return m > 0 ? `${m} min` : ''
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🎬  Fetching HIF sermon playlists from YouTube...\n')

  const result = []

  for (const { playlistId, seriesTitle } of SERMON_PLAYLISTS) {
    console.log(`  📋  Series: ${seriesTitle} (${playlistId})`)

    // Fetch playlist items
    let items
    try {
      items = await fetchAllPlaylistItems(playlistId)
    } catch (err) {
      console.error(`     ⚠️  Failed to fetch playlist: ${err.message}`)
      continue
    }

    // Filter out deleted/private videos
    const validItems = items.filter(
      (item) =>
        item.snippet.title !== 'Deleted video' &&
        item.snippet.title !== 'Private video' &&
        item.snippet.resourceId?.videoId,
    )

    console.log(`     ✅  ${validItems.length} videos found`)

    // Fetch duration for each video
    const videoIds = validItems.map((item) => item.snippet.resourceId.videoId)
    const videoDetails = await fetchVideoDetails(videoIds)

    // Build sermon entries
    const sermons = validItems.map((item) => {
      const videoId = item.snippet.resourceId.videoId
      const detail = videoDetails[videoId]
      const duration = parseDuration(detail?.contentDetails?.duration)
      const publishedAt = item.snippet.publishedAt || item.snippet.videoOwnerChannelId
      const date = publishedAt ? publishedAt.split('T')[0] : ''

      return {
        youtubeId: videoId,
        title: item.snippet.title,
        date,
        description: item.snippet.description || '',
        speaker: '',      // ← FILL THIS IN before importing
        scripture: '',    // ← Optional: e.g. "Psalm 23"
        duration,
      }
    })

    result.push({
      seriesTitle,
      playlistId,
      sermons,
    })
  }

  // Write output
  mkdirSync(resolve(ROOT, 'data'), { recursive: true })
  const outPath = resolve(ROOT, 'data', 'sermons-review.json')
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8')

  const totalSermons = result.reduce((n, s) => n + s.sermons.length, 0)
  console.log(`\n✅  Done! ${totalSermons} sermons across ${result.length} series written to:`)
  console.log(`   data/sermons-review.json\n`)
  console.log('📝  Next steps:')
  console.log('   1. Open data/sermons-review.json')
  console.log('   2. Fill in "speaker" for each sermon (exact name as it should appear in Team)')
  console.log('   3. Optionally fill in "scripture" for each sermon')
  console.log('   4. Run: node scripts/yt-import-sermons.mjs')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
