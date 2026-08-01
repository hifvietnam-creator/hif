/**
 * scripts/check-connections.ts
 *
 * Phase 0 smoke test. Verifies that both read-only API clients can
 * authenticate and that the data volumes are what we expect, BEFORE any
 * schema or backfill work starts.
 *
 * Neither client can write, so this script is safe to run at any time.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/check-connections.ts
 *
 * Requires .env:
 *   PCO_APP_ID=...
 *   PCO_SECRET=...
 *   MAILERLITE_API_KEY=...
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Safe to import statically: both clients read process.env lazily inside their
// request functions, not at module load, so loadEnv() below still takes effect.
import { count as pcoCount, whoami } from '../src/lib/pco'
import {
  MAX_LIMIT,
  count as mlCount,
  get as mlGet,
  paginateCursor,
  paginatePage,
  type MailerLiteSubscriber,
} from '../src/lib/mailerlite'

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

loadEnv()

const ok = (msg: string) => console.log(`  \x1b[32m✓\x1b[0m ${msg}`)
const bad = (msg: string) => console.log(`  \x1b[31m✗\x1b[0m ${msg}`)
const info = (msg: string) => console.log(`    \x1b[2m${msg}\x1b[0m`)

let failures = 0

// ── Planning Center ──────────────────────────────────────────────────────────

console.log('\n\x1b[1mPlanning Center\x1b[0m')

try {
  const me = await whoami()
  ok(`Authenticated as ${me.name} (person ${me.id})`)

  // Permission check. A PAT inherits its user's PCO permissions, so a
  // restricted user returns PARTIAL data — the dashboard would look fine and
  // be quietly wrong. Compare these against what you see in the PCO UI.
  const people = await pcoCount('/people/v2/people')
  const activePeople = await pcoCount('/people/v2/people?where[status]=active')
  const groups = await pcoCount('/groups/v2/groups')

  ok(`People visible:        ${people.toLocaleString()}`)
  ok(`  of which active:     ${activePeople.toLocaleString()}`)
  ok(`Groups visible:        ${groups.toLocaleString()}`)
  info('Compare these to the PCO web UI. A mismatch means the token’s user')
  info('has restricted permissions and every downstream number will be wrong.')
} catch (err) {
  bad(String(err instanceof Error ? err.message : err))
  failures++
}

// ── MailerLite ───────────────────────────────────────────────────────────────

console.log('\n\x1b[1mMailerLite\x1b[0m')

try {
  const total = await mlCount()
  ok(`Authenticated. Total subscribers: ${total.toLocaleString()}`)

  // Status breakdown. Three of these five are fixable problems rather than
  // rejections, and separating them is the fastest win available.
  const statuses = ['active', 'unsubscribed', 'unconfirmed', 'bounced', 'junk'] as const
  const counts: Record<string, number> = {}

  for (const status of statuses) {
    const res = await mlGet<{ total: number }>('/subscribers', {
      limit: 0,
      'filter[status]': status,
    })
    counts[status] = res.total
  }

  console.log()
  for (const status of statuses) {
    const n = counts[status] ?? 0
    const pct = total > 0 ? ((n / total) * 100).toFixed(1) : '0.0'
    const note =
      status === 'bounced'
        ? '← bad addresses, fixable'
        : status === 'unconfirmed'
          ? '← broken opt-in, fixable'
          : status === 'junk'
            ? '← spam complaints'
            : ''
    console.log(`    ${status.padEnd(14)} ${String(n).padStart(6)}  ${pct.padStart(5)}%  ${note}`)
  }

  // Groups — do they carry meaning (campus / ministry / language) or are they ad hoc?
  const groupPages = paginatePage<{ id: string; name: string; active_count: number }>('/groups')
  const groups: Array<{ id: string; name: string; active_count: number }> = []
  for await (const batch of groupPages) groups.push(...batch)

  console.log()
  ok(`Groups: ${groups.length}`)
  for (const g of groups.slice(0, 15)) {
    info(`${g.name} — ${g.active_count} active`)
  }
  if (groups.length > 15) info(`… and ${groups.length - 15} more`)

  // Sanity-check the sweep cost claim from the design doc.
  const sweeps = Math.ceil(total / MAX_LIMIT)
  console.log()
  info(`Full subscriber sweep = ${sweeps} request(s) at limit=${MAX_LIMIT}.`)
  info(`Per-person activity-log would be ${total} requests ≈ ${Math.ceil(total / 120)} min.`)
} catch (err) {
  bad(String(err instanceof Error ? err.message : err))
  failures++
}

// ── Windowing check ──────────────────────────────────────────────────────────
// The design doc flags an open question: are subscriber opens_count/open_rate
// LIFETIME figures or windowed? If lifetime, "recently engaged" cannot be
// derived from them and must come from campaign reports instead.

console.log('\n\x1b[1mEngagement field check\x1b[0m')

try {
  for await (const batch of paginateCursor<MailerLiteSubscriber>('/subscribers', {}, 3)) {
    for (const s of batch) {
      info(
        `${s.email} — status=${s.status} sent=${s.sent} opens=${s.opens_count} ` +
          `clicks=${s.clicks_count} open_rate=${s.open_rate} subscribed=${s.subscribed_at}`,
      )
    }
    break // one page is enough
  }
  ok('Sampled subscriber shape above.')
  info('If opens_count looks like a lifetime total, recency must come from')
  info('campaign reports — adjust the quadrant logic before Phase 1D.')
} catch (err) {
  bad(String(err instanceof Error ? err.message : err))
  failures++
}

console.log()
if (failures > 0) {
  console.log(`\x1b[31m${failures} check(s) failed.\x1b[0m\n`)
  process.exit(1)
}
console.log('\x1b[32mAll connections OK.\x1b[0m\n')
