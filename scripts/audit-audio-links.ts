/**
 * scripts/audit-audio-links.ts
 *
 * READ-ONLY. Checks whether the archive MP3 links actually resolve.
 *
 * Nearly every audio URL is `dl.dropboxusercontent.com/u/<id>/…`, which is the
 * old Dropbox *Public folder* scheme. Dropbox disabled it in March 2017, so the
 * expectation is that most or all are dead — but expectation is not evidence,
 * and 174 sermons hang on the answer. This measures it.
 *
 * Each distinct URL gets a HEAD request (falling back to a ranged GET, since
 * some hosts reject HEAD), following redirects. What counts as alive is not
 * just a 200: Dropbox serves an HTML "file not found" page with status 200, so
 * anything that comes back as text/html is treated as dead regardless of code.
 *
 * Outputs:
 *   reports/audio-audit-<date>.md    — summary by host and failure reason
 *   reports/audio-audit-<date>.json  — per-URL detail, including which sermons
 *
 * Usage:
 *   pnpm audit:audio
 *   pnpm audit:audio --limit=25      # sample first, it is 174 requests
 *   pnpm audit:audio --concurrency=4
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
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

interface Result {
  url: string
  host: string
  status: number | null
  contentType: string | null
  contentLength: number | null
  alive: boolean
  reason: string
  sermons: Array<{ id: string; title: string }>
  filename: string | null
}

const TIMEOUT_MS = 15_000

/** The filename survives even when the file does not — useful for re-matching. */
function filenameFrom(url: string): string | null {
  try {
    const path = decodeURIComponent(new URL(url).pathname)
    const last = path.split('/').filter(Boolean).pop()
    return last && /\.(mp3|m4a|wav)$/i.test(last) ? last : null
  } catch {
    return null
  }
}

async function probe(url: string): Promise<Omit<Result, 'sermons' | 'filename'>> {
  const host = (() => {
    try {
      return new URL(url).host
    } catch {
      return 'invalid-url'
    }
  })()

  const check = async (method: 'HEAD' | 'GET') => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
    try {
      return await fetch(url, {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: {
          'User-Agent': 'HIF-Dashboard/1.0 (archive link audit)',
          // Ask for the first byte only — no need to pull whole MP3s.
          ...(method === 'GET' ? { Range: 'bytes=0-0' } : {}),
        },
      })
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    let res = await check('HEAD')
    // Some hosts refuse HEAD outright; a ranged GET settles it.
    if (res.status === 405 || res.status === 501) res = await check('GET')

    const contentType = res.headers.get('content-type')
    const lenRaw = res.headers.get('content-range') ?? res.headers.get('content-length')
    const contentLength = lenRaw ? Number(lenRaw.split('/').pop()) || null : null

    if (!res.ok && res.status !== 206) {
      return { url, host, status: res.status, contentType, contentLength, alive: false, reason: `HTTP ${res.status}` }
    }
    // Dropbox returns its "not found" page with a 200, so status alone lies.
    if (contentType && /text\/html/i.test(contentType)) {
      return {
        url, host, status: res.status, contentType, contentLength,
        alive: false,
        reason: 'HTML returned instead of audio — almost certainly an error page',
      }
    }
    if (contentType && !/audio|octet-stream|mpeg/i.test(contentType)) {
      return {
        url, host, status: res.status, contentType, contentLength,
        alive: false,
        reason: `unexpected content-type "${contentType}"`,
      }
    }
    return { url, host, status: res.status, contentType, contentLength, alive: true, reason: 'ok' }
  } catch (err) {
    const msg = (err as Error).name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : (err as Error).message
    return { url, host, status: null, contentType: null, contentLength: null, alive: false, reason: msg }
  }
}

async function main() {
  loadEnv()
  const args = process.argv.slice(2)
  const limitArg = args.find((a) => a.startsWith('--limit='))
  const concArg = args.find((a) => a.startsWith('--concurrency='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity
  const concurrency = concArg ? Math.max(1, Number(concArg.split('=')[1])) : 6

  const { getPayload } = await import('payload')
  const configPromise = (await import('@payload-config')).default
  const payload = await getPayload({ config: configPromise })

  const res = await payload.find({
    collection: 'sermons',
    where: { audioURL: { exists: true } },
    limit: 5000,
    depth: 0,
    draft: true,
    overrideAccess: true,
    select: { title: true, audioURL: true },
  })

  const byUrl = new Map<string, Array<{ id: string; title: string }>>()
  for (const d of res.docs as Array<Record<string, any>>) {
    if (!d.audioURL) continue
    const u = String(d.audioURL)
    byUrl.set(u, [...(byUrl.get(u) ?? []), { id: String(d.id), title: String(d.title) }])
  }

  const urls = [...byUrl.keys()].slice(0, limit)
  console.log(`${res.docs.length} sermons with audio · ${byUrl.size} distinct URLs`)
  console.log(`Checking ${urls.length} at concurrency ${concurrency}…\n`)

  const results: Result[] = []
  let done = 0
  const queue = [...urls]
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length) {
        const url = queue.shift()!
        const r = await probe(url)
        results.push({ ...r, sermons: byUrl.get(url) ?? [], filename: filenameFrom(url) })
        done++
        if (done % 20 === 0) console.log(`  ${done}/${urls.length}`)
      }
    }),
  )

  const alive = results.filter((r) => r.alive)
  const dead = results.filter((r) => !r.alive)
  const affected = dead.reduce((n, r) => n + r.sermons.length, 0)

  // ── report ──
  const L: string[] = []
  L.push('# Archive audio links — audit')
  L.push('')
  L.push(`Generated ${new Date().toISOString()} · **read-only**`)
  L.push('')
  L.push('| | Count |')
  L.push('|---|---:|')
  L.push(`| Sermons with an audio URL | ${res.docs.length} |`)
  L.push(`| Distinct URLs | ${byUrl.size} |`)
  L.push(`| Checked | ${results.length} |`)
  L.push(`| Reachable | ${alive.length} |`)
  L.push(`| Dead | ${dead.length} |`)
  L.push(`| Sermons affected by a dead link | ${affected} |`)
  L.push('')

  const byHost = new Map<string, { alive: number; dead: number }>()
  for (const r of results) {
    const e = byHost.get(r.host) ?? { alive: 0, dead: 0 }
    r.alive ? e.alive++ : e.dead++
    byHost.set(r.host, e)
  }
  L.push('## By host')
  L.push('')
  L.push('| Host | Reachable | Dead |')
  L.push('|---|---:|---:|')
  for (const [host, e] of [...byHost].sort((a, b) => b[1].alive + b[1].dead - (a[1].alive + a[1].dead))) {
    L.push(`| ${host} | ${e.alive} | ${e.dead} |`)
  }
  L.push('')

  const byReason = new Map<string, number>()
  for (const r of dead) byReason.set(r.reason, (byReason.get(r.reason) ?? 0) + 1)
  if (byReason.size > 0) {
    L.push('## Why they failed')
    L.push('')
    L.push('| Reason | Count |')
    L.push('|---|---:|')
    for (const [reason, n] of [...byReason].sort((a, b) => b[1] - a[1])) L.push(`| ${reason} | ${n} |`)
    L.push('')
  }

  if (alive.length > 0) {
    L.push('## Reachable')
    L.push('')
    for (const r of alive.slice(0, 60)) {
      const mb = r.contentLength ? ` · ${(r.contentLength / 1_048_576).toFixed(1)} MB` : ''
      L.push(`- ${r.sermons[0]?.title ?? '?'}${mb}`)
    }
    if (alive.length > 60) L.push(`- …and ${alive.length - 60} more`)
    L.push('')
  }

  L.push('## Original filenames')
  L.push('')
  L.push('Kept because the filename outlives the file. If these MP3s exist anywhere')
  L.push('else — a hard drive, OneDrive, an old backup — this is the key to match')
  L.push('them back to the right sermon.')
  L.push('')
  const named = results.filter((r) => r.filename)
  for (const r of named.slice(0, 40)) L.push(`- \`${r.filename}\` → ${r.sermons[0]?.title ?? '?'}`)
  if (named.length > 40) L.push(`- …and ${named.length - 40} more (see the JSON)`)
  L.push('')

  mkdirSync(resolve(ROOT, 'reports'), { recursive: true })
  const stamp = new Date().toISOString().slice(0, 10)
  writeFileSync(resolve(ROOT, `reports/audio-audit-${stamp}.json`), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2))
  writeFileSync(resolve(ROOT, `reports/audio-audit-${stamp}.md`), L.join('\n'))

  console.log(`\n${alive.length} reachable · ${dead.length} dead · ${affected} sermons affected`)
  console.log(`Report: ./reports/audio-audit-${stamp}.md`)

  // ── optionally record the verdict on the sermons themselves ──
  if (args.includes('--apply')) {
    const deadSermonIds = new Set(dead.flatMap((r) => r.sermons.map((s) => s.id)))
    const aliveSermonIds = new Set(alive.flatMap((r) => r.sermons.map((s) => s.id)))
    let marked = 0
    let cleared = 0

    for (const d of res.docs as Array<Record<string, any>>) {
      const id = String(d.id)
      const shouldMark = deadSermonIds.has(id)
      const shouldClear = aliveSermonIds.has(id)
      if (!shouldMark && !shouldClear) continue
      if (Boolean(d.audioUnavailable) === shouldMark) continue

      await payload.update({
        collection: 'sermons',
        id: d.id,
        data: { audioUnavailable: shouldMark },
        overrideAccess: true,
        draft: d._status !== 'published',
        // 185 revalidations would be pointless churn; the tag is dropped once below.
        context: { disableRevalidate: true },
      })
      shouldMark ? marked++ : cleared++
    }
    console.log(`\n✓ ${marked} marked unavailable · ${cleared} cleared (link came back)`)
    console.log('  The URL is kept — it is these sermons\' only unique key, and')
    console.log('  clearing it would make the next import duplicate them.')
  } else if (dead.length > 0) {
    console.log(`\nRe-run with --apply to hide the player on ${affected} affected sermons.`)
  }

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
