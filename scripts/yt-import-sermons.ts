/**
 * scripts/yt-import-sermons.ts
 *
 * Reads data/sermons-review.json and upserts Series + Team + Sermons
 * directly into Payload using the local API (no dev server needed).
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/yt-import-sermons.ts
 *
 * Requires:
 *   - data/sermons-review.json (run node scripts/yt-fetch-sermons.mjs first)
 *   - DATABASE_URL + PAYLOAD_SECRET in .env
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Types ─────────────────────────────────────────────────────────────────────
interface SermonEntry {
  youtubeId: string
  title: string
  date: string
  description: string
  speaker: string
  scripture: string
  duration: string
}

interface SeriesEntry {
  seriesTitle: string
  playlistId: string
  sermons: SermonEntry[]
}

// ── Load .env ─────────────────────────────────────────────────────────────────
// Called inside main() BEFORE the dynamic config import so that
// buildConfig() in payload.config.ts reads PAYLOAD_SECRET correctly.
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

// ── Helpers ───────────────────────────────────────────────────────────────────
const seriesCache: Record<string, number | string> = {}
const teamCache: Record<string, number | string> = {}

async function findOrCreateSeries(
  payload: Awaited<ReturnType<typeof getPayload>>,
  title: string,
  playlistId: string,
): Promise<number | string> {
  if (seriesCache[title]) return seriesCache[title]

  const existing = await payload.find({
    collection: 'series',
    where: { title: { equals: title } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    const doc = existing.docs[0]
    seriesCache[title] = doc.id
    if (!doc.youtubePlaylistId && playlistId) {
      await payload.update({
        collection: 'series',
        id: doc.id,
        data: { youtubePlaylistId: playlistId, _status: 'published' },
        overrideAccess: true,
      })
    }
    console.log(`     📚  Series found:   "${title}"`)
    return doc.id
  }

  const created = await payload.create({
    collection: 'series',
    data: {
      title,
      youtubePlaylistId: playlistId,
      year: new Date().getFullYear(),
      _status: 'published',
    },
    overrideAccess: true,
  })
  seriesCache[title] = created.id
  console.log(`     📚  Series created: "${title}"`)
  return created.id
}

async function findOrCreateTeam(
  payload: Awaited<ReturnType<typeof getPayload>>,
  name: string,
): Promise<number | string | null> {
  if (!name.trim()) return null
  const normalised = name.trim()
  if (teamCache[normalised]) return teamCache[normalised]

  const existing = await payload.find({
    collection: 'team',
    where: { name: { equals: normalised } },
    limit: 1,
    overrideAccess: true,
  })

  if (existing.docs.length > 0) {
    teamCache[normalised] = existing.docs[0].id
    return existing.docs[0].id
  }

  const created = await payload.create({
    collection: 'team',
    // staffMember: false — guest/imported speakers should NOT appear on the About page.
    // Real staff who also preach (Jacob, Kester, etc.) should be manually set
    // to staffMember: true in the admin panel.
    data: { name: normalised, role: 'Speaker', staffMember: false },
    overrideAccess: true,
  })
  teamCache[normalised] = created.id
  console.log(`     👤  Team member created: "${normalised}"`)
  return created.id
}

async function upsertSermon(
  payload: Awaited<ReturnType<typeof getPayload>>,
  sermon: SermonEntry,
  seriesId: number | string,
) {
  const youtubeURL = `https://www.youtube.com/watch?v=${sermon.youtubeId}`
  const speakerId = sermon.speaker ? await findOrCreateTeam(payload, sermon.speaker) : null

  const existing = await payload.find({
    collection: 'sermons',
    where: { youtubeURL: { equals: youtubeURL } },
    limit: 1,
    overrideAccess: true,
  })

  const data: Record<string, unknown> = {
    title: sermon.title,
    youtubeURL,
    date: sermon.date,
    series: seriesId,
    _status: 'published',
    ...(speakerId ? { speaker: speakerId } : {}),
    ...(sermon.description ? { description: sermon.description } : {}),
    ...(sermon.scripture ? { scripture: sermon.scripture } : {}),
    ...(sermon.duration ? { duration: sermon.duration } : {}),
  }

  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'sermons',
      id: existing.docs[0].id,
      data,
      overrideAccess: true,
    })
    return 'updated'
  }

  await payload.create({ collection: 'sermons', data, overrideAccess: true })
  return 'created'
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Load env FIRST — buildConfig() in payload.config.ts reads PAYLOAD_SECRET
  loadEnv()

  // 2. Dynamically import config AFTER env is loaded
  const { default: config } = await import('@payload-config')

  // 3. Read review file
  const reviewPath = resolve(ROOT, 'data', 'sermons-review.json')
  let reviewData: SeriesEntry[]
  try {
    reviewData = JSON.parse(readFileSync(reviewPath, 'utf8'))
  } catch {
    console.error('❌  Cannot read data/sermons-review.json — run: node scripts/yt-fetch-sermons.mjs')
    process.exit(1)
  }

  const noSpeaker = reviewData.flatMap((s) => s.sermons).filter((s) => !s.speaker)
  if (noSpeaker.length > 0) {
    console.warn(`⚠️   ${noSpeaker.length} sermon(s) have no speaker set — importing without one.\n`)
  }

  console.log('🔌  Connecting to Payload...')
  const payload = await getPayload({ config })
  console.log('✅  Connected.\n')

  let created = 0
  let updated = 0

  for (const series of reviewData) {
    console.log(`\n📋  Importing: ${series.seriesTitle} (${series.sermons.length} sermons)`)
    const seriesId = await findOrCreateSeries(payload, series.seriesTitle, series.playlistId)

    for (const sermon of series.sermons) {
      try {
        const action = await upsertSermon(payload, sermon, seriesId)
        if (action === 'created') {
          created++
          console.log(`     ✅  Created: "${sermon.title}"`)
        } else {
          updated++
          console.log(`     🔄  Updated: "${sermon.title}"`)
        }
      } catch (err) {
        console.error(`     ❌  Failed "${sermon.title}":`, (err as Error).message)
      }
    }
  }

  console.log(`\n🎉  Done! ${created} created, ${updated} updated.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
