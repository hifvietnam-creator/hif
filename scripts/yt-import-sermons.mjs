/**
 * scripts/yt-import-sermons.mjs
 *
 * Reads data/sermons-review.json (after you've filled in speakers) and
 * upserts Series + Team members + Sermons into Payload via the REST API.
 *
 * Usage (dev server must be running):
 *   node scripts/yt-import-sermons.mjs
 *
 * Requires in .env:
 *   PAYLOAD_ADMIN_EMAIL
 *   PAYLOAD_ADMIN_PASSWORD
 *   NEXT_PUBLIC_SERVER_URL  (defaults to http://localhost:3000)
 */

import { readFileSync } from 'fs'
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
  } catch {}
}
loadEnv()

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
const EMAIL = process.env.PAYLOAD_ADMIN_EMAIL
const PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD

if (!EMAIL || !PASSWORD) {
  console.error('❌  Set PAYLOAD_ADMIN_EMAIL and PAYLOAD_ADMIN_PASSWORD in .env')
  process.exit(1)
}

// ── REST API helpers ──────────────────────────────────────────────────────────
let authToken = null

async function login() {
  const res = await fetch(`${BASE_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Login failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  authToken = data.token
  console.log(`🔐  Logged in as ${EMAIL}`)
}

async function apiGet(path, query = {}) {
  const url = new URL(`${BASE_URL}/api${path}`)
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v)
  const res = await fetch(url.toString(), {
    headers: { Authorization: `JWT ${authToken}` },
  })
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${await res.text()}`)
  return res.json()
}

async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${authToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed (${res.status}): ${await res.text()}`)
  return res.json()
}

async function apiPatch(path, body) {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `JWT ${authToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PATCH ${path} failed (${res.status}): ${await res.text()}`)
  return res.json()
}

// ── Find or create helpers ────────────────────────────────────────────────────
const seriesCache = {}
const teamCache = {}

async function findOrCreateSeries(title, playlistId) {
  if (seriesCache[title]) return seriesCache[title]

  // Search by title
  const existing = await apiGet('/series', {
    'where[title][equals]': title,
    limit: 1,
    draft: 'true',
  })

  if (existing.docs.length > 0) {
    const doc = existing.docs[0]
    seriesCache[title] = doc.id

    // Update youtubePlaylistId if missing
    if (!doc.youtubePlaylistId && playlistId) {
      await apiPatch(`/series/${doc.id}`, { youtubePlaylistId: playlistId })
    }
    console.log(`     📚  Series found:   "${title}" (id: ${doc.id})`)
    return doc.id
  }

  // Create new series
  const year = new Date().getFullYear()
  const created = await apiPost('/series', {
    title,
    year,
    youtubePlaylistId: playlistId,
    _status: 'published',
  })
  seriesCache[title] = created.doc.id
  console.log(`     📚  Series created: "${title}" (id: ${created.doc.id})`)
  return created.doc.id
}

async function findOrCreateTeamMember(name) {
  if (!name || name.trim() === '') return null
  const normalised = name.trim()
  if (teamCache[normalised]) return teamCache[normalised]

  const existing = await apiGet('/team', {
    'where[name][equals]': normalised,
    limit: 1,
  })

  if (existing.docs.length > 0) {
    teamCache[normalised] = existing.docs[0].id
    return existing.docs[0].id
  }

  // Create a stub team member — admin can fill in photo/bio later
  const created = await apiPost('/team', {
    name: normalised,
    role: 'Speaker',
  })
  teamCache[normalised] = created.doc.id
  console.log(`     👤  Team member created: "${normalised}"`)
  return created.doc.id
}

async function upsertSermon(sermon, seriesId) {
  const youtubeURL = `https://www.youtube.com/watch?v=${sermon.youtubeId}`
  const speakerId = await findOrCreateTeamMember(sermon.speaker)

  // Check if sermon already exists (match by youtubeURL)
  const existing = await apiGet('/sermons', {
    'where[youtubeURL][equals]': youtubeURL,
    limit: 1,
    draft: 'true',
  })

  const payload = {
    title: sermon.title,
    youtubeURL,
    date: sermon.date,
    description: sermon.description || undefined,
    scripture: sermon.scripture || undefined,
    duration: sermon.duration || undefined,
    series: seriesId || undefined,
    speaker: speakerId || undefined,
    _status: 'published',
  }

  if (existing.docs.length > 0) {
    const id = existing.docs[0].id
    await apiPatch(`/sermons/${id}`, payload)
    return { action: 'updated', id }
  }

  const created = await apiPost('/sermons', payload)
  return { action: 'created', id: created.doc.id }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // Load review file
  const reviewPath = resolve(ROOT, 'data', 'sermons-review.json')
  let reviewData
  try {
    reviewData = JSON.parse(readFileSync(reviewPath, 'utf8'))
  } catch {
    console.error(`❌  Cannot read data/sermons-review.json — run yt-fetch-sermons.mjs first`)
    process.exit(1)
  }

  // Warn if any sermons have no speaker
  const noSpeaker = reviewData.flatMap((s) => s.sermons).filter((s) => !s.speaker)
  if (noSpeaker.length > 0) {
    console.warn(`⚠️   ${noSpeaker.length} sermon(s) have no speaker set — they will be imported without one.`)
    console.warn('    Fill in "speaker" in data/sermons-review.json before re-running to fix.\n')
  }

  await login()

  let created = 0
  let updated = 0

  for (const series of reviewData) {
    console.log(`\n📋  Importing series: ${series.seriesTitle} (${series.sermons.length} sermons)`)
    const seriesId = await findOrCreateSeries(series.seriesTitle, series.playlistId)

    for (const sermon of series.sermons) {
      try {
        const result = await upsertSermon(sermon, seriesId)
        if (result.action === 'created') {
          created++
          console.log(`     ✅  Created: "${sermon.title}"`)
        } else {
          updated++
          console.log(`     🔄  Updated: "${sermon.title}"`)
        }
      } catch (err) {
        console.error(`     ❌  Failed "${sermon.title}": ${err.message}`)
      }
    }
  }

  console.log(`\n🎉  Import complete! ${created} created, ${updated} updated.`)
  console.log('    Open the Payload admin to review: http://localhost:3000/admin/collections/sermons')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
