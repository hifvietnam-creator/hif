/**
 * scripts/yt-sync-media.mjs
 *
 * Fetches the latest video from the announcement and testimony playlists,
 * then updates the MediaHighlights global in Payload.
 *
 * Usage (dev server must be running):
 *   node scripts/yt-sync-media.mjs
 *
 * Requires in .env:
 *   YOUTUBE_API_KEY
 *   PAYLOAD_ADMIN_EMAIL
 *   PAYLOAD_ADMIN_PASSWORD
 *   NEXT_PUBLIC_SERVER_URL  (defaults to http://localhost:3000)
 *
 * To add worship sync: fill in WORSHIP_PLAYLIST_ID below.
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Playlist config ───────────────────────────────────────────────────────────
const ANNOUNCEMENT_PLAYLIST = 'PL7A2w2jsUkUnKuNaSQdLwu_DGFBzFxeWu'

// Both testimony playlists — we pick the most recent video across both
const TESTIMONY_PLAYLISTS = [
  'PL7A2w2jsUkUl4FHTOdR1u3Gtz6y7bC_BE',
  'PL7A2w2jsUkUnk84vYR31iTwX-tmmVHXMz',
]

// Set this to your worship playlist ID when you have one
const WORSHIP_PLAYLIST = '' // e.g. 'PL7A2w2jsUkUl...'

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
  } catch {}
}
loadEnv()

const YT_API_KEY = process.env.YOUTUBE_API_KEY
const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_ADMIN_EMAIL
const PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD

if (!YT_API_KEY) { console.error('❌  YOUTUBE_API_KEY not set'); process.exit(1) }
if (!EMAIL || !PASSWORD) { console.error('❌  PAYLOAD_ADMIN_EMAIL / PAYLOAD_ADMIN_PASSWORD not set'); process.exit(1) }

// ── YouTube helper ────────────────────────────────────────────────────────────
async function getLatestFromPlaylist(playlistId) {
  const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
  url.searchParams.set('key', YT_API_KEY)
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('playlistId', playlistId)
  url.searchParams.set('maxResults', '10') // fetch a few to skip deleted/private

  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`YouTube API error ${res.status}`)
  const data = await res.json()

  const valid = (data.items || []).filter(
    (item) =>
      item.snippet.title !== 'Deleted video' &&
      item.snippet.title !== 'Private video' &&
      item.snippet.resourceId?.videoId,
  )

  if (valid.length === 0) return null

  // Playlists are ordered newest-first by default
  const item = valid[0]
  return {
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt?.split('T')[0] ?? null,
  }
}

async function getMostRecentAcrossPlaylists(playlistIds) {
  const results = await Promise.allSettled(playlistIds.map(getLatestFromPlaylist))
  const valid = results
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value)

  if (valid.length === 0) return null

  // Sort by publishedAt descending, pick most recent
  valid.sort((a, b) => {
    if (!a.publishedAt) return 1
    if (!b.publishedAt) return -1
    return b.publishedAt.localeCompare(a.publishedAt)
  })

  return valid[0]
}

// ── Payload REST helpers ──────────────────────────────────────────────────────
async function login() {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${await res.text()}`)
  const data = await res.json()
  console.log(`🔐  Logged in as ${EMAIL}`)
  return data.token
}

async function updateMediaHighlights(token, data) {
  const res = await fetch(`${BASE_URL}/api/globals/media-highlights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`Update failed: ${await res.text()}`)
  return res.json()
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📡  Syncing media highlights from YouTube...\n')

  // Fetch in parallel
  const [announcement, testimony, worship] = await Promise.allSettled([
    getLatestFromPlaylist(ANNOUNCEMENT_PLAYLIST),
    getMostRecentAcrossPlaylists(TESTIMONY_PLAYLISTS),
    WORSHIP_PLAYLIST ? getLatestFromPlaylist(WORSHIP_PLAYLIST) : Promise.resolve(null),
  ])

  const ann = announcement.status === 'fulfilled' ? announcement.value : null
  const test = testimony.status === 'fulfilled' ? testimony.value : null
  const wor = worship.status === 'fulfilled' ? worship.value : null

  if (announcement.status === 'rejected') console.error('⚠️  Announcement fetch failed:', announcement.reason?.message)
  if (testimony.status === 'rejected') console.error('⚠️  Testimony fetch failed:', testimony.reason?.message)

  console.log('📢  Announcement:', ann ? `"${ann.title}" (${ann.videoId})` : 'none')
  console.log('🙏  Testimony:   ', test ? `"${test.title}" (${test.videoId})` : 'none')
  console.log('🎵  Worship:     ', wor ? `"${wor.title}" (${wor.videoId})` : 'no playlist configured')

  const token = await login()

  const payload = {}
  if (ann) payload.announcement = { videoId: ann.videoId, title: ann.title, publishedAt: ann.publishedAt }
  if (test) payload.testimony = { videoId: test.videoId, title: test.title, publishedAt: test.publishedAt }
  if (wor) payload.worship = { videoId: wor.videoId, title: wor.title, publishedAt: wor.publishedAt }

  if (Object.keys(payload).length === 0) {
    console.log('\nℹ️  Nothing to update.')
    return
  }

  await updateMediaHighlights(token, payload)
  console.log('\n✅  MediaHighlights global updated successfully.')
  console.log('    View in admin: http://localhost:3000/admin/globals/media-highlights')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
