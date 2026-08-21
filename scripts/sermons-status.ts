/**
 * scripts/sermons-status.ts
 *
 * READ-ONLY. Prints the current state of the sermon archive in one shot.
 *
 * Exists because "where are we?" kept needing three or four separate queries,
 * and because the answer to "are they published yet?" determines what is worth
 * doing next. Safe to run any time; touches nothing.
 *
 * Usage: pnpm sermons:status
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
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const k = t.slice(0, eq).trim()
      const v = t.slice(eq + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  } catch {
    /* optional */
  }
}

const bar = (n: number, total: number, width = 28) => {
  const filled = total === 0 ? 0 : Math.round((n / total) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

const row = (label: string, n: number, total: number) =>
  `  ${label.padEnd(24)} ${String(n).padStart(4)}  ${bar(n, total)}  ${total ? ((n / total) * 100).toFixed(0) : 0}%`

async function main() {
  loadEnv()

  const { getPayload } = await import('payload')
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  const [sermons, series, team] = await Promise.all([
    payload.find({
      collection: 'sermons',
      limit: 5000,
      depth: 0,
      draft: true,
      overrideAccess: true,
      select: {
        title: true, date: true, sortDate: true, slug: true,
        youtubeURL: true, audioURL: true, audioUnavailable: true,
        sermonPdfUrl: true, speaker: true, series: true, _status: true,
      },
    }),
    payload.find({ collection: 'series', limit: 500, depth: 0, overrideAccess: true, select: { title: true, year: true } }),
    payload.find({ collection: 'team', limit: 500, depth: 0, overrideAccess: true, select: { name: true, staffMember: true } }),
  ])

  const all = sermons.docs as Array<Record<string, any>>
  const total = all.length
  const published = all.filter((s) => s._status === 'published')
  const drafts = all.filter((s) => s._status !== 'published')

  console.log(`\n  SERMON ARCHIVE — ${new Date().toISOString().slice(0, 10)}`)
  console.log(`  ${'─'.repeat(66)}`)
  console.log(`\n  ${total} sermons · ${series.docs.length} series · ${team.docs.length} team members\n`)

  console.log('  PUBLICATION')
  console.log(row('published (live)', published.length, total))
  console.log(row('draft (invisible)', drafts.length, total))

  console.log('\n  MEDIA')
  console.log(row('video', all.filter((s) => s.youtubeURL).length, total))
  console.log(row('audio, playable', all.filter((s) => s.audioURL && !s.audioUnavailable).length, total))
  console.log(row('audio, dead link', all.filter((s) => s.audioUnavailable).length, total))
  console.log(row('no media at all', all.filter((s) => !s.youtubeURL && !s.audioURL).length, total))

  console.log('\n  METADATA')
  console.log(row('has date', all.filter((s) => s.date).length, total))
  console.log(row('has speaker', all.filter((s) => s.speaker).length, total))
  console.log(row('has series', all.filter((s) => s.series).length, total))
  console.log(row('has slides link', all.filter((s) => s.sermonPdfUrl).length, total))

  // ── integrity checks: things that are silently wrong ──
  const problems: string[] = []

  const missingSortDate = all.filter((s) => !s.sortDate)
  if (missingSortDate.length) {
    problems.push(
      `${missingSortDate.length} sermons have no sortDate — they will sort ABOVE the newest. ` +
        `Fix: pnpm backfill:sortdate --apply`,
    )
  }

  const slugCounts = new Map<string, number>()
  for (const s of all) slugCounts.set(String(s.slug), (slugCounts.get(String(s.slug)) ?? 0) + 1)
  const dupSlugs = [...slugCounts].filter(([, n]) => n > 1)
  if (dupSlugs.length) {
    problems.push(`${dupSlugs.length} duplicate slugs — these collide on /sermons/<slug>: ${dupSlugs.slice(0, 3).map(([s]) => s).join(', ')}`)
  }

  const noSlug = all.filter((s) => !s.slug)
  if (noSlug.length) problems.push(`${noSlug.length} sermons have no slug and cannot be published`)

  const publishedUndated = published.filter((s) => !s.date)
  const yearlessSeries = (series.docs as Array<Record<string, any>>).filter((s) => !s.year)
  if (yearlessSeries.length) {
    problems.push(`${yearlessSeries.length} series have no year — they sort last in the sidebar (expected if their sermons are undated)`)
  }

  const orphanSpeakers = (team.docs as Array<Record<string, any>>).filter(
    (t) => !all.some((s) => String(typeof s.speaker === 'object' ? s.speaker?.id : s.speaker) === String(t.id)),
  )
  if (orphanSpeakers.length) {
    problems.push(`${orphanSpeakers.length} team members have no sermons (fine if they are staff, odd if imported)`)
  }

  console.log('\n  CHECKS')
  if (problems.length === 0) {
    console.log('  Nothing obviously wrong.')
  } else {
    for (const p of problems) console.log(`  ! ${p}`)
  }

  console.log('\n  NEXT')
  if (drafts.length > 0) {
    console.log(`  ${drafts.length} sermons are invisible to visitors.`)
    console.log('  → pnpm diagnose:publish --all    (why they will not publish, and how many)')
  } else if (publishedUndated.length > 0) {
    console.log(`  All published. ${publishedUndated.length} are undated and sort last — expected.`)
  } else {
    console.log('  Archive is live.')
  }
  console.log('')

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
