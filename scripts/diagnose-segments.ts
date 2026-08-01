/**
 * scripts/diagnose-segments.ts
 *
 * The cross-tab that matters: PCO membership status × MailerLite reachability.
 *
 * Supersedes the Q4 section of diagnose-data.ts, which used a broken
 * `isMember()` (it counted anyone with ANY membership value, including
 * Visitors, Alumni and Facility records — 6,617 instead of 319).
 *
 * Produces:
 *   - A full membership × email-status matrix
 *   - The same rolled up to HIF Journey stages
 *   - Engagement quality per segment
 *   - CSV action lists in ./diagnose-out/
 *
 * Read-only. Nothing is written to PCO or MailerLite.
 *
 * Usage:
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/diagnose-segments.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import { paginate as pcoPaginate, type PcoResource } from '../src/lib/pco'
import { paginateCursor, type MailerLiteSubscriber, type MailerLiteStatus } from '../src/lib/mailerlite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'diagnose-out')

function loadEnv() {
  try {
    const envFile = readFileSync(resolve(ROOT, '.env'), 'utf8')
    for (const line of envFile.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim()
    }
  } catch {}
}
loadEnv()

const norm = (e: string) => e.trim().toLowerCase()
const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(0) + '%' : '—')

// ── HIF Journey mapping, derived from the real PCO membership taxonomy ───────
// Draft for leadership to confirm — these are inferred, not authoritative.
const JOURNEY: Record<string, string> = {
  Visitor: 'TRY',
  'New Resident': 'TRY',
  Spotlight: 'TRY',
  'Exploring Church': 'TRY',
  Friend: 'TRY',

  'In Progress': 'JOIN',
  Participant: 'JOIN',
  Local: 'JOIN',
  'Regular Attender': 'JOIN',
  'Applied Membership': 'JOIN',
  Returnee: 'JOIN',

  Member: 'MEMBER',
  'Member Kid': 'MEMBER',

  'KQ Kid': 'YOUTH',
  Aftershock: 'YOUTH',

  Alumni: 'DEPARTED',
  Facility: 'EXCLUDE', // Almost certainly not people.
  '(none)': 'UNCLASSIFIED',
}

const STATUSES = ['active', 'unsubscribed', 'bounced', 'junk', 'not_on_list'] as const
type Bucket = (typeof STATUSES)[number]

// ── Fetch ────────────────────────────────────────────────────────────────────

type PersonAttrs = { name: string; status: string; membership: string | null }
const people = new Map<string, PersonAttrs>()
for await (const page of pcoPaginate<PcoResource<PersonAttrs>>('/people/v2/people')) {
  for (const p of page.data) people.set(p.id, p.attributes)
  process.stdout.write(`\r  people: ${people.size}`)
}

type EmailAttrs = { address: string; primary: boolean }
type EmailRels = { person: { data: { id: string; type: string } | null } }
const emailToPerson = new Map<string, string>()
for await (const page of pcoPaginate<PcoResource<EmailAttrs, EmailRels>>('/people/v2/emails')) {
  for (const e of page.data) {
    const pid = e.relationships?.person?.data?.id
    const addr = e.attributes?.address
    if (pid && addr) emailToPerson.set(norm(addr), pid)
  }
  process.stdout.write(`\r  emails: ${emailToPerson.size}`)
}

type Sub = { email: string; status: MailerLiteStatus; sent: number; opens: number; clicks: number }
const subs: Sub[] = []
for await (const batch of paginateCursor<MailerLiteSubscriber>('/subscribers')) {
  for (const s of batch) {
    subs.push({
      email: s.email,
      status: s.status,
      sent: s.sent ?? 0,
      opens: s.opens_count ?? 0,
      clicks: s.clicks_count ?? 0,
    })
  }
  process.stdout.write(`\r  subscribers: ${subs.length}`)
}
process.stdout.write('\r' + ' '.repeat(40) + '\r')

// ── Resolve one status + engagement per PCO person ───────────────────────────
// A person may hold several addresses. One working address is enough to reach
// them, so take the best status across all of them.
const RANK: Record<string, number> = { active: 5, unconfirmed: 4, unsubscribed: 3, junk: 2, bounced: 1 }

const personStatus = new Map<string, MailerLiteStatus>()
const personEngagement = new Map<string, { sent: number; opens: number; clicks: number }>()
const mlOnly: Sub[] = []

for (const s of subs) {
  const pid = emailToPerson.get(norm(s.email))
  if (!pid) {
    mlOnly.push(s)
    continue
  }
  const cur = personStatus.get(pid)
  if (!cur || (RANK[s.status] ?? 0) > (RANK[cur] ?? 0)) personStatus.set(pid, s.status)

  const agg = personEngagement.get(pid) ?? { sent: 0, opens: 0, clicks: 0 }
  agg.sent += s.sent
  agg.opens += s.opens
  agg.clicks += s.clicks
  personEngagement.set(pid, agg)
}

const bucketOf = (pid: string): Bucket => {
  const st = personStatus.get(pid)
  if (!st) return 'not_on_list'
  return st === 'unconfirmed' ? 'active' : (st as Bucket)
}

// ── Matrix helper ────────────────────────────────────────────────────────────

function renderMatrix(title: string, keyOf: (a: PersonAttrs) => string, order?: string[]) {
  console.log(`\n\x1b[1m━━ ${title} ${'━'.repeat(Math.max(0, 60 - title.length))}\x1b[0m\n`)

  const rows = new Map<string, Record<Bucket, number>>()
  for (const [pid, attrs] of people) {
    const key = keyOf(attrs)
    if (!rows.has(key)) {
      rows.set(key, { active: 0, unsubscribed: 0, bounced: 0, junk: 0, not_on_list: 0 })
    }
    rows.get(key)![bucketOf(pid)]++
  }

  const keys = order
    ? order.filter((k) => rows.has(k))
    : [...rows.keys()].sort((a, b) => {
        const sum = (k: string) => Object.values(rows.get(k)!).reduce((x, y) => x + y, 0)
        return sum(b) - sum(a)
      })

  console.log(
    '  ' +
      'segment'.padEnd(20) +
      'total'.padStart(7) +
      'active'.padStart(8) +
      'unsub'.padStart(7) +
      'bounce'.padStart(8) +
      'none'.padStart(7) +
      '   reach',
  )
  console.log('  ' + '─'.repeat(66))

  for (const k of keys) {
    const r = rows.get(k)!
    const total = Object.values(r).reduce((x, y) => x + y, 0)
    const reach = pct(r.active, total)
    const warn = r.active / total < 0.5 ? '\x1b[33m' : ''
    console.log(
      '  ' +
        k.padEnd(20) +
        String(total).padStart(7) +
        String(r.active).padStart(8) +
        String(r.unsubscribed).padStart(7) +
        String(r.bounced).padStart(8) +
        String(r.not_on_list).padStart(7) +
        `   ${warn}${reach.padStart(4)}\x1b[0m`,
    )
  }
  return rows
}

renderMatrix('Membership × reachability', (a) => a.membership ?? '(none)')

renderMatrix(
  'HIF Journey stage × reachability',
  (a) => JOURNEY[a.membership ?? '(none)'] ?? 'UNMAPPED',
  ['TRY', 'JOIN', 'MEMBER', 'YOUTH', 'DEPARTED', 'UNCLASSIFIED', 'EXCLUDE', 'UNMAPPED'],
)

// ── Engagement quality per stage ─────────────────────────────────────────────

console.log(`\n\x1b[1m━━ Engagement quality by journey stage ${'━'.repeat(24)}\x1b[0m\n`)
console.log('  ' + 'stage'.padEnd(16) + 'people'.padStart(8) + 'sent'.padStart(9) + 'opened'.padStart(9) + 'clicked'.padStart(9) + '   open%   click%')
console.log('  ' + '─'.repeat(66))

const stageAgg = new Map<string, { n: number; sent: number; opens: number; clicks: number }>()
for (const [pid, attrs] of people) {
  const stage = JOURNEY[attrs.membership ?? '(none)'] ?? 'UNMAPPED'
  const e = personEngagement.get(pid)
  if (!e) continue
  const a = stageAgg.get(stage) ?? { n: 0, sent: 0, opens: 0, clicks: 0 }
  a.n++
  a.sent += e.sent
  a.opens += e.opens
  a.clicks += e.clicks
  stageAgg.set(stage, a)
}

for (const stage of ['TRY', 'JOIN', 'MEMBER', 'YOUTH', 'DEPARTED', 'UNCLASSIFIED']) {
  const a = stageAgg.get(stage)
  if (!a) continue
  console.log(
    '  ' +
      stage.padEnd(16) +
      String(a.n).padStart(8) +
      String(a.sent).padStart(9) +
      String(a.opens).padStart(9) +
      String(a.clicks).padStart(9) +
      `   ${pct(a.opens, a.sent).padStart(5)}   ${pct(a.clicks, a.sent).padStart(5)}`,
  )
}
console.log('\n  \x1b[2mNote: opens are lifetime totals and Apple Mail Privacy Protection')
console.log('  inflates them. Clicks are the trustworthy signal.\x1b[0m')

// ── Action lists ─────────────────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true })

const csv = (rows: string[][]) =>
  rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')

const personRows = (filter: (pid: string, a: PersonAttrs) => boolean) => {
  const out: string[][] = [['pco_person_id', 'name', 'membership', 'email_status']]
  for (const [pid, a] of people) {
    if (filter(pid, a)) out.push([pid, a.name, a.membership ?? '', bucketOf(pid)])
  }
  return out
}

const CORE = new Set(['MEMBER', 'JOIN'])
const isCore = (a: PersonAttrs) => CORE.has(JOURNEY[a.membership ?? '(none)'] ?? '')

const bouncedCore = personRows((pid, a) => isCore(a) && bucketOf(pid) === 'bounced')
const missingCore = personRows((pid, a) => isCore(a) && bucketOf(pid) === 'not_on_list')
const unsubCore = personRows((pid, a) => isCore(a) && bucketOf(pid) === 'unsubscribed')

writeFileSync(resolve(OUT, 'core-bounced.csv'), csv(bouncedCore), 'utf8')
writeFileSync(resolve(OUT, 'core-not-on-list.csv'), csv(missingCore), 'utf8')
writeFileSync(resolve(OUT, 'core-unsubscribed.csv'), csv(unsubCore), 'utf8')

// The "watching from a distance" audience: engaged, but no church record.
const engagedStrangers = mlOnly
  .filter((s) => s.status === 'active' && s.clicks > 0)
  .sort((a, b) => b.clicks - a.clicks)
writeFileSync(
  resolve(OUT, 'ml-only-engaged.csv'),
  csv([['email', 'sent', 'opens', 'clicks'], ...engagedStrangers.map((s) => [s.email, String(s.sent), String(s.opens), String(s.clicks)])]),
  'utf8',
)

console.log(`\n\x1b[1m━━ Action lists written to diagnose-out/ ${'━'.repeat(22)}\x1b[0m\n`)
console.log(`  core-bounced.csv        ${bouncedCore.length - 1} — bad addresses on core people. Fixable today.`)
console.log(`  core-not-on-list.csv    ${missingCore.length - 1} — core people never added to the list.`)
console.log(`  core-unsubscribed.csv   ${unsubCore.length - 1} — opted out. Respect it; find another channel.`)
console.log(`  ml-only-engaged.csv     ${engagedStrangers.length} — CLICK on your email, no PCO record.`)
console.log('\n  \x1b[2mThese contain personal data. diagnose-out/ should be gitignored.\x1b[0m\n')
