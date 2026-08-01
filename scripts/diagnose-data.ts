/**
 * scripts/diagnose-data.ts
 *
 * Phase 1 pre-flight. Answers the questions the smoke test raised, before we
 * commit to any schema:
 *
 *   1. Was the MailerLite list bulk re-imported? (subscribed_at clustering)
 *   2. Is there any real engagement history, or is opens/clicks all zero?
 *   3. What is the ACTUAL overlap between PCO people and MailerLite subscribers?
 *   4. How many PCO members are unreachable by email? ← the money question
 *   5. How many MailerLite subscribers are not in PCO at all?
 *
 * Read-only. Fetches ~130 PCO requests + 8 MailerLite requests, joins in
 * memory, writes a report. Nothing is persisted to either system.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/diagnose-data.ts
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import { paginate as pcoPaginate, type PcoResource } from '../src/lib/pco'
import {
  paginateCursor,
  paginatePage,
  type MailerLiteSubscriber,
  type MailerLiteStatus,
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

const norm = (e: string) => e.trim().toLowerCase()
const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(1) + '%' : '—')
const h1 = (s: string) => console.log(`\n\x1b[1m━━ ${s} ${'━'.repeat(Math.max(0, 58 - s.length))}\x1b[0m`)
const row = (label: string, value: string | number, note = '') =>
  console.log(`  ${label.padEnd(42)} ${String(value).padStart(8)}  \x1b[2m${note}\x1b[0m`)

const report: string[] = []
const log = (s = '') => {
  console.log(s)
  report.push(s.replace(/\x1b\[[0-9;]*m/g, ''))
}

// ── 1. MailerLite sweep ──────────────────────────────────────────────────────

h1('MailerLite subscribers')

type Sub = Pick<
  MailerLiteSubscriber,
  'id' | 'email' | 'status' | 'sent' | 'opens_count' | 'clicks_count' | 'subscribed_at' | 'created_at'
>

const subs: Sub[] = []
for await (const batch of paginateCursor<MailerLiteSubscriber>('/subscribers')) {
  for (const s of batch) {
    subs.push({
      id: s.id,
      email: s.email,
      status: s.status,
      sent: s.sent,
      opens_count: s.opens_count,
      clicks_count: s.clicks_count,
      subscribed_at: s.subscribed_at,
      created_at: s.created_at,
    })
  }
  process.stdout.write(`\r  fetched ${subs.length}...`)
}
process.stdout.write('\r')
row('Total subscribers', subs.length)

// ── 2. Is the list bulk-imported? ────────────────────────────────────────────

h1('Q1: Was the list bulk re-imported?')

const byCreatedDay = new Map<string, number>()
const bySubscribedDay = new Map<string, number>()
for (const s of subs) {
  const c = (s.created_at ?? '').slice(0, 10)
  const b = (s.subscribed_at ?? '').slice(0, 10)
  if (c) byCreatedDay.set(c, (byCreatedDay.get(c) ?? 0) + 1)
  if (b) bySubscribedDay.set(b, (bySubscribedDay.get(b) ?? 0) + 1)
}

const topDays = (m: Map<string, number>) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

log('\n  Top created_at days:')
for (const [day, n] of topDays(byCreatedDay)) {
  row(`  ${day}`, n, pct(n, subs.length))
}
log('\n  Top subscribed_at days:')
for (const [day, n] of topDays(bySubscribedDay)) {
  row(`  ${day}`, n, pct(n, subs.length))
}

const biggestDay = topDays(byCreatedDay)[0]
if (biggestDay && biggestDay[1] / subs.length > 0.5) {
  log(
    `\n  \x1b[33m⚠ ${pct(biggestDay[1], subs.length)} of subscribers were created on ` +
      `${biggestDay[0]}.\x1b[0m`,
  )
  log('    This is a bulk import. subscribed_at is the IMPORT date, not the real')
  log('    signup date — so "how long subscribed" is unavailable, and pre-import')
  log('    engagement history is gone.')
} else {
  log('\n  ✓ Creation dates are spread out — no single bulk import dominates.')
}

// ── 3. Engagement distribution ───────────────────────────────────────────────

h1('Q2: Is there real engagement history?')

const everSent = subs.filter((s) => (s.sent ?? 0) > 0).length
const multiSent = subs.filter((s) => (s.sent ?? 0) > 1).length
const anyOpen = subs.filter((s) => (s.opens_count ?? 0) > 0).length
const anyClick = subs.filter((s) => (s.clicks_count ?? 0) > 0).length
const maxSent = Math.max(0, ...subs.map((s) => s.sent ?? 0))

row('Received >=1 email', everSent, pct(everSent, subs.length))
row('Received >1 email', multiSent, pct(multiSent, subs.length))
row('Opened at least once', anyOpen, pct(anyOpen, subs.length))
row('Clicked at least once', anyClick, pct(anyClick, subs.length))
row('Max emails sent to one person', maxSent)

if (anyOpen === 0 && anyClick === 0) {
  log('\n  \x1b[33m⚠ ZERO engagement recorded across the entire list.\x1b[0m')
  log('    The quadrant analysis has no data to stand on yet. Either the list was')
  log('    just imported, or engagement tracking is not being recorded.')
  log('    → Phase 1D (quadrants) must wait for campaign history to accumulate.')
} else if (maxSent <= 1) {
  log('\n  \x1b[33m⚠ At most 1 email has been sent to anyone.\x1b[0m')
  log('    Engagement rates will not be meaningful until more campaigns go out.')
} else {
  log('\n  ✓ Engagement history exists and is usable.')
}

// ── 4. Campaigns ─────────────────────────────────────────────────────────────

h1('Campaign history')

type Campaign = { id: string; name: string; status: string; finished_at: string | null }
const campaigns: Campaign[] = []
try {
  for await (const batch of paginatePage<Campaign>('/campaigns')) campaigns.push(...batch)
  row('Total campaigns', campaigns.length)
  const sent = campaigns.filter((c) => c.finished_at)
  row('Sent campaigns', sent.length)
  const dates = sent.map((c) => c.finished_at!).sort()
  if (dates.length) {
    row('Earliest send', dates[0]!.slice(0, 10))
    row('Latest send', dates[dates.length - 1]!.slice(0, 10))
  }
  for (const c of sent.slice(-10)) {
    log(`    ${(c.finished_at ?? '').slice(0, 10)}  ${c.name}`)
  }
} catch (err) {
  log(`  \x1b[31m✗ ${err instanceof Error ? err.message : String(err)}\x1b[0m`)
}

// ── 5. PCO people + emails ───────────────────────────────────────────────────

h1('Planning Center people')

type PersonAttrs = {
  name: string
  status: string
  membership: string | null
  child: boolean
  created_at: string
}
const people = new Map<string, PersonAttrs>()
for await (const page of pcoPaginate<PcoResource<PersonAttrs>>('/people/v2/people')) {
  for (const p of page.data) people.set(p.id, p.attributes)
  process.stdout.write(`\r  fetched ${people.size} people...`)
}
process.stdout.write('\r')
row('Total people', people.size)

const membershipCounts = new Map<string, number>()
for (const p of people.values()) {
  const key = p.membership ?? '(none)'
  membershipCounts.set(key, (membershipCounts.get(key) ?? 0) + 1)
}
log('\n  Membership breakdown:')
for (const [k, n] of [...membershipCounts.entries()].sort((a, b) => b[1] - a[1])) {
  row(`  ${k}`, n, pct(n, people.size))
}

// Emails come from the dedicated endpoint — cleaner than sideloading on people.
h1('Planning Center emails')

type EmailAttrs = { address: string; primary: boolean }
type EmailRels = { person: { data: { id: string; type: string } | null } }

const emailToPerson = new Map<string, string>()
const personEmailCount = new Map<string, number>()
let emailRecords = 0

for await (const page of pcoPaginate<PcoResource<EmailAttrs, EmailRels>>('/people/v2/emails')) {
  for (const e of page.data) {
    const personId = e.relationships?.person?.data?.id
    const addr = e.attributes?.address
    if (!personId || !addr) continue
    emailRecords++
    emailToPerson.set(norm(addr), personId)
    personEmailCount.set(personId, (personEmailCount.get(personId) ?? 0) + 1)
  }
  process.stdout.write(`\r  fetched ${emailRecords} emails...`)
}
process.stdout.write('\r')
row('Email records', emailRecords)
row('Distinct addresses', emailToPerson.size)
row('People with >=1 email', personEmailCount.size, pct(personEmailCount.size, people.size))
row('People with NO email', people.size - personEmailCount.size, '← unreachable by definition')

// ── 6. The overlap ───────────────────────────────────────────────────────────

h1('Q3: PCO ↔ MailerLite overlap (exact email match)')

const subByEmail = new Map<string, Sub>()
for (const s of subs) subByEmail.set(norm(s.email), s)

let matched = 0
const matchedPersonIds = new Set<string>()
const mlOnly: Sub[] = []

for (const [email, sub] of subByEmail) {
  const personId = emailToPerson.get(email)
  if (personId) {
    matched++
    matchedPersonIds.add(personId)
  } else {
    mlOnly.push(sub)
  }
}

const pcoOnly = [...personEmailCount.keys()].filter((id) => !matchedPersonIds.has(id))

row('MailerLite subscribers matched to PCO', matched, pct(matched, subs.length))
row('Distinct PCO people matched', matchedPersonIds.size, pct(matchedPersonIds.size, people.size))
row('MailerLite ONLY (not in PCO)', mlOnly.length, pct(mlOnly.length, subs.length))
row('PCO with email, NOT on list', pcoOnly.length, pct(pcoOnly.length, people.size))

const mlOnlyByStatus = new Map<string, number>()
for (const s of mlOnly) mlOnlyByStatus.set(s.status, (mlOnlyByStatus.get(s.status) ?? 0) + 1)
log('\n  MailerLite-only, by status:')
for (const [k, n] of [...mlOnlyByStatus.entries()].sort((a, b) => b[1] - a[1])) {
  row(`  ${k}`, n)
}

// ── 7. The money question ────────────────────────────────────────────────────

h1('Q4: Are PCO members reachable by email?')

// Reverse index: person -> best subscriber status across all their addresses.
// "Best" = active beats unsubscribed beats bounced, since one working address
// is enough to reach someone.
const RANK: Record<string, number> = { active: 5, unconfirmed: 4, unsubscribed: 3, junk: 2, bounced: 1 }
const personStatus = new Map<string, MailerLiteStatus>()

for (const [email, sub] of subByEmail) {
  const personId = emailToPerson.get(email)
  if (!personId) continue
  const current = personStatus.get(personId)
  if (!current || (RANK[sub.status] ?? 0) > (RANK[current] ?? 0)) {
    personStatus.set(personId, sub.status)
  }
}

const isMember = (a: PersonAttrs) => !!a.membership && a.membership.toLowerCase() !== 'no'
const members = [...people.entries()].filter(([, a]) => isMember(a))

const bucket = (personId: string) => personStatus.get(personId) ?? 'not_on_list'
const memberBuckets = new Map<string, number>()
for (const [id] of members) {
  const b = bucket(id)
  memberBuckets.set(b, (memberBuckets.get(b) ?? 0) + 1)
}

log(`\n  Of ${members.length} PCO members:`)
for (const [k, n] of [...memberBuckets.entries()].sort((a, b) => b[1] - a[1])) {
  const note =
    k === 'active'
      ? '✓ reachable'
      : k === 'unsubscribed'
        ? '← present but unreachable (a choice)'
        : k === 'bounced'
          ? '← present but unreachable (FIXABLE: bad address)'
          : k === 'not_on_list'
            ? '← never on the list at all'
            : ''
  row(`  ${k}`, n, `${pct(n, members.length)}  ${note}`)
}

const unreachableMembers =
  (memberBuckets.get('unsubscribed') ?? 0) +
  (memberBuckets.get('bounced') ?? 0) +
  (memberBuckets.get('junk') ?? 0) +
  (memberBuckets.get('not_on_list') ?? 0)

log(
  `\n  \x1b[1m→ ${unreachableMembers} of ${members.length} members (${pct(
    unreachableMembers,
    members.length,
  )}) cannot currently be reached by email.\x1b[0m`,
)
log('    Of those, the "bounced" group is a data-quality bug you can fix today.')

// ── 8. Write report ──────────────────────────────────────────────────────────

const outPath = resolve(ROOT, 'diagnose-report.txt')
writeFileSync(outPath, report.join('\n'), 'utf8')
log(`\n  Report written to ${outPath}\n`)
