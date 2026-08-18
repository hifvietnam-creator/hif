/**
 * scripts/import-kq-roster.ts
 *
 * Loads the KidzQuest roster spreadsheets into the `kq` schema.
 *
 * DRY RUN IS THE DEFAULT. Nothing is written unless you pass --commit.
 * A dry run parses everything, resolves identities, and writes an HTML report
 * to data/kq/import-preview.html so you can see exactly what would land.
 *
 *   pnpm import:kq              parse + report only, no database
 *   pnpm import:kq --commit     same, then write it
 *
 * Put the exports here first:
 *   data/kq/Active Explorers.csv
 *   data/kq/Active Voyagers.csv
 *   data/kq/Active Trailblazer.csv
 *   data/kq/Active_Path_Finders_1.csv
 *   data/kq/Active Parents.csv        (optional, used as a cross-check)
 *
 * This is a throwaway. Once the roster is in, Cognito is the source of new
 * registrations and this never runs again — so it is one self-contained file
 * rather than split across src/lib like the PCO syncs.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_DIR = resolve(ROOT, 'data', 'kq')

function loadEnv() {
  try {
    const envFile = readFileSync(resolve(ROOT, '.env'), 'utf8')
    for (const line of envFile.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const eq = t.indexOf('=')
      if (eq === -1) continue
      const k = t.slice(0, eq).trim()
      if (!process.env[k]) process.env[k] = t.slice(eq + 1).trim()
    }
  } catch {}
}
loadEnv()

const COMMIT = process.argv.includes('--commit')

// ── The rollover ─────────────────────────────────────────────────────────────
// KidzQuest moves everyone up on the first Sunday of August. 2 Aug 2026 falls
// inside the May–Aug span of these spreadsheets, so the imported attendance
// straddles two academic years and has to be split at this date.
const ROLLOVER = '2026-08-02'
const YEAR_PREV = '2025-26'
const YEAR_CURR = '2026-27'

// Which group a grade belongs to. Mirrors kq.grade_map — kept here too so the
// dry run can project next year's rooms without touching the database.
const GRADE_TO_GROUP: Record<number, string> = {
  0: 'explorers',
  1: 'voyagers', 2: 'voyagers',
  3: 'trailblazers', 4: 'trailblazers',
  5: 'pathfinders', 6: 'pathfinders', 7: 'pathfinders',
}
const GROUP_ORDER = ['explorers', 'voyagers', 'trailblazers', 'pathfinders', 'aftershock']

const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const warn = (m: string) => console.log(`  \x1b[33m⚠\x1b[0m ${m}`)
const info = (m: string) => console.log(`  \x1b[2m·\x1b[0m \x1b[2m${m}\x1b[0m`)

// ── CSV ──────────────────────────────────────────────────────────────────────
// Hand-rolled rather than a dependency. These files contain quoted fields with
// embedded newlines (Alt+Enter in Excel), which a naive split('\n') destroys.

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const src = text.replace(/^﻿/, '').replace(/\r\n/g, '\n')

  for (let i = 0; i < src.length; i++) {
    const c = src[i]!
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ }
        else inQuotes = false
      } else field += c
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field); field = ''
    } else if (c === '\n') {
      row.push(field); rows.push(row); row = []; field = ''
    } else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

// ── Cleaning ─────────────────────────────────────────────────────────────────

/** Collapse in-cell newlines and runs of whitespace; empty becomes null. */
const clean = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).replace(/\s+/g, ' ').trim()
  return s === '' ? null : s
}

const cleanEmail = (v: unknown): string | null => {
  const s = clean(v)
  return s ? s.toLowerCase() : null
}

/** Normalise for comparison: strip diacritics, lowercase, collapse spaces. */
const norm = (v: string | null): string =>
  (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

type Phone = { raw: string | null; digits: string | null; e164: string | null; issue: string | null }

/**
 * Vietnamese mobiles are 10 digits starting 0.
 *
 * 9 digits  → Excel ate the leading zero (proven: Mhatet Villezon and Naz Adams
 *             each appear correct on one sheet and stripped on another). Repair.
 * 11 digits → a stray extra digit. NOT repairable — we cannot know which one is
 *             wrong, so it is flagged for a human, never guessed at.
 */
function cleanPhone(v: unknown): Phone {
  const raw = clean(v)
  if (!raw) return { raw: null, digits: null, e164: null, issue: null }

  let d = raw.replace(/\D/g, '')
  let issue: string | null = null

  if (d.startsWith('84') && d.length === 11) d = '0' + d.slice(2)

  if (d.length === 9) { d = '0' + d; issue = 'repaired: prepended leading 0' }
  else if (d.length === 10 && !d.startsWith('0')) issue = '10 digits but no leading 0'
  else if (d.length > 10) issue = `${d.length} digits — too long, needs re-asking`
  else if (d.length < 9) issue = `${d.length} digits — too short`

  // Length alone is not enough. Vietnamese mobiles are 10 digits beginning
  // 03/05/07/08/09; anything beginning 02 (or the pre-2017 area codes like 04
  // for Hanoi) is a LANDLINE, and 10 digits of it sails through a length check.
  //
  // Found in the data: 043 534 1916 on the Denness record — an old-format Hanoi
  // landline that became 024 3534 1916 in 2017. It passes as "10 digits, starts
  // with 0" and would have been stored as +84435341916, which dials nowhere.
  const mobile = /^0[35789]/.test(d)
  const valid = d.length === 10 && mobile
  if (d.length === 10 && !mobile && !issue)
    issue = 'looks like a landline, not a mobile — cannot be texted'

  return { raw, digits: d, e164: valid ? '+84' + d.slice(1) : null, issue }
}

/** True when a number is a usable Vietnamese mobile. */
const isMobile = (d: string | null) => !!d && d.length === 10 && /^0[35789]/.test(d)

/** Edit distance, capped — used only to spot near-duplicate child names. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1))
  return dp[a.length]![b.length]!
}

// ── Sheet → records ──────────────────────────────────────────────────────────

const GROUP_OF: Record<string, string> = {
  explorers: 'explorers', voyagers: 'voyagers',
  trailblazers: 'trailblazers', pathfinders: 'pathfinders',
}

type RawChild = {
  sheet: string
  group: string
  rowNo: string | null
  firstName: string
  lastName: string | null
  gender: string | null
  contactName: string | null
  email: string | null
  phone: Phone
  attended: string[]          // ISO dates
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** '3-May' → '2026-05-03'. The sheets carry no year; the term is 2026. */
function parseSundayHeader(h: string, year = 2026): string | null {
  const m = clean(h)?.match(/^(\d{1,2})\s*[-/ ]\s*([A-Za-z]{3})/)
  if (!m) return null
  const day = parseInt(m[1]!, 10)
  const mon = MONTHS[m[2]!.toLowerCase()]
  if (!mon) return null
  return `${year}-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function readSheet(path: string, filename: string): RawChild[] {
  const rows = parseCsv(readFileSync(path, 'utf8'))

  // Header position differs on every sheet — Explorers row 2, Pathfinders row 3,
  // and the banner starts in a different column each time. Find it by content.
  const hIdx = rows.findIndex((r) => r.some((c) => norm(c) === 'first name'))
  if (hIdx === -1) throw new Error(`${filename}: no header row containing "First Name"`)

  const header = rows[hIdx]!
  const col = (name: string) => header.findIndex((c) => norm(c) === norm(name))

  const cFirst = col('First Name')
  const cLast = col('Last Name')
  const cGender = col('Gender')
  const cContact = col('Primary Contact Name')
  const cEmail = col('Email')
  const cPhone = col('Contact #')
  const cLoc = col('Location')

  const dates: { idx: number; iso: string }[] = []
  for (let i = cLoc + 1; i < header.length; i++) {
    const iso = parseSundayHeader(header[i] ?? '')
    if (iso) dates.push({ idx: i, iso })
  }

  const out: RawChild[] = []
  for (let r = hIdx + 1; r < rows.length; r++) {
    const row = rows[r]!
    const firstName = clean(row[cFirst])
    if (!firstName) continue                       // blank template row

    const locRaw = norm(row[cLoc] ?? '')           // 'Pathfinders ' has a trailing space
    const group = GROUP_OF[locRaw] ?? null
    if (!group) continue

    out.push({
      sheet: filename,
      group,
      rowNo: clean(row[0]),
      firstName,
      lastName: clean(row[cLast]),
      gender: (() => {
        const g = norm(clean(row[cGender]))        // 'Female ' vs 'Female'
        return g === 'male' ? 'Male' : g === 'female' ? 'Female' : null
      })(),
      contactName: clean(row[cContact]),
      email: cleanEmail(row[cEmail]),
      phone: cleanPhone(row[cPhone]),
      attended: dates.filter((d) => norm(row[d.idx]) === 'yes').map((d) => d.iso),
    })
  }
  return out
}

// ── Guardian identity ────────────────────────────────────────────────────────
//
// Union-find over contact points. Two rows are the same guardian if they share
// an email OR a phone.
//
// This is what catches Hang Nguyen: 'Nguyen Thi Hang' with
// nguyenhang15071987@gmail.com and 'Hang Nguyen' with nguyenhang150787@gmail.com
// are one person, proven by an identical phone. Matching on name alone misses
// it; matching on email alone misses it.
//
// It also means a shared family inbox merges two parents into one — which is
// why every multi-name cluster is reported for review rather than trusted.

class Union {
  private parent = new Map<string, string>()
  find(x: string): string {
    if (!this.parent.has(x)) this.parent.set(x, x)
    let p = this.parent.get(x)!
    if (p !== x) { p = this.find(p); this.parent.set(x, p) }
    return p
  }
  union(a: string, b: string) {
    const ra = this.find(a), rb = this.find(b)
    if (ra !== rb) this.parent.set(ra, rb)
  }
}

type Guardian = {
  id: number
  name: string
  nameVariants: string[]
  emails: string[]
  phones: string[]
  e164: string | null
  childKeys: string[]
  issues: string[]
}

// ── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n\x1b[1mKidzQuest roster import\x1b[0m  (${COMMIT ? '\x1b[31mCOMMIT\x1b[0m' : 'dry run'})\n`)

if (!existsSync(DATA_DIR)) {
  console.error(`  Put the CSV exports in ${DATA_DIR} first.`)
  process.exit(1)
}

const files = readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith('.csv'))

// Class rosters only. The parents mailing list is a cross-check, and the grade
// files are our own output/input — reading either as a class sheet finds no
// Location column, silently yields zero children, and then lists itself as an
// input in the report as though it had contributed something.
const classFiles = files.filter((f) => !/parent|grade/i.test(f))

let raw: RawChild[] = []
for (const f of classFiles) {
  try {
    const rows = readSheet(join(DATA_DIR, f), f)
    if (rows.length === 0) { warn(`${f} — no rows matched a known group, skipped`); continue }
    ok(`${f.padEnd(32)} ${String(rows.length).padStart(3)} children  [${rows[0]!.group}]`)
    raw = raw.concat(rows)
  } catch (e) {
    warn(`${f} — ${e instanceof Error ? e.message : String(e)}`)
  }
}

// Two sheets exporting the same group is an export mistake, not data.
const byGroup = new Map<string, RawChild[]>()
for (const c of raw) {
  if (!byGroup.has(c.group)) byGroup.set(c.group, [])
  byGroup.get(c.group)!.push(c)
}
for (const [g, rows] of byGroup) {
  const sheets = [...new Set(rows.map((r) => r.sheet))]
  if (sheets.length > 1) {
    warn(`group "${g}" came from ${sheets.length} files — de-duplicating: ${sheets.join(', ')}`)
    const seen = new Set<string>()
    byGroup.set(g, rows.filter((r) => {
      const k = `${norm(r.firstName)}|${norm(r.lastName)}`
      if (seen.has(k)) return false
      seen.add(k); return true
    }))
  }
}
raw = [...byGroup.values()].flat()

console.log('')
ok(`${raw.length} children across ${byGroup.size} groups`)

// ── Grades ───────────────────────────────────────────────────────────────────
//
// The spreadsheets carry no grade and no birthdate, so nothing in them says
// which children moved up on 2 Aug. Explorers is the only group that resolves
// on its own — grade 0 is the whole group, so all of them become Voyagers.
// Every other group splits, and only a grade tells you where the split falls.
//
// Optional file: data/kq/grades.csv with columns
//     First Name, Last Name, Group, Grade
// where Grade is the grade the child is ENTERING in 2026-27.
//
// If it is absent or incomplete, the dry run writes a worksheet listing every
// child still missing one, ready to hand to the teachers.

type GradeRow = { grade: number }
const grades = new Map<string, GradeRow>()
const gradeKey = (first: string | null, last: string | null, group: string) =>
  `${group}|${norm(first)}|${norm(last)}`

// grades.csv is the filled-in file. grade-worksheet.csv is the blank one this
// script writes — reading it back would find no grades and, worse, would win
// the lookup on some filesystems once both exist.
const gradeFile =
  files.find((f) => f.toLowerCase() === 'grades.csv')
  ?? files.find((f) => /grade/i.test(f) && !/worksheet/i.test(f))
if (gradeFile) {
  const rows = parseCsv(readFileSync(join(DATA_DIR, gradeFile), 'utf8'))
  const hIdx = rows.findIndex((r) => r.some((c) => norm(c) === 'first name'))
  if (hIdx === -1) warn(`${gradeFile} — no "First Name" header, ignored`)
  else {
    const h = rows[hIdx]!
    const ci = (n: string) => h.findIndex((c) => norm(c) === norm(n))
    const [cF, cL, cG, cGr] = [ci('First Name'), ci('Last Name'), ci('Group'), ci('Grade')]
    for (let r = hIdx + 1; r < rows.length; r++) {
      const row = rows[r]!
      const g = parseInt(clean(row[cGr]) ?? '', 10)
      if (!clean(row[cF]) || Number.isNaN(g)) continue
      grades.set(gradeKey(clean(row[cF]), clean(row[cL]), norm(row[cG] ?? '')), { grade: g })
    }
    ok(`${gradeFile.padEnd(32)} ${String(grades.size).padStart(3)} grades`)
  }
}

/**
 * Where a child sits in 2026-27.
 *
 * Nobody waits for a grade. Every child gets placed, and anything we had to
 * assume is marked provisional so the app can chase it — a teacher tapping
 * through their own register on a Sunday, rather than busy volunteers being
 * asked to fill in a spreadsheet midweek.
 *
 *   grade on file      → exact placement, confirmed
 *   Explorers          → all become Voyagers. Grade 0 is the entire group, so
 *                        this is arithmetic, not a guess. Confirmed.
 *   everyone else      → provisionally stays put. About half will be wrong,
 *                        and a wrong room is recoverable in thirty seconds
 *                        whereas a child missing from every register is not.
 */
function resolveNewYear(c: RawChild): {
  grade: number | null; group: string; provisional: boolean; note: string | null
} {
  const hit = grades.get(gradeKey(c.firstName, c.lastName, c.group))
  if (hit)
    return {
      grade: hit.grade,
      group: GRADE_TO_GROUP[hit.grade] ?? 'aftershock',
      provisional: false,
      note: null,
    }

  if (c.group === 'explorers')
    return { grade: 1, group: 'voyagers', provisional: false, note: 'Explorers is grade 0 entire — promotion is certain' }

  return {
    grade: null,
    group: c.group,
    provisional: true,
    note: `no grade on file — held in ${c.group}; confirm or move up in the app`,
  }
}

const provisional = raw.filter((c) => resolveNewYear(c).provisional)

ok(`all ${raw.length} children placed in ${YEAR_CURR}`)
if (provisional.length)
  warn(`${provisional.length} placements are provisional — confirm in the app, not by email`)

// ── Resolve guardians ────────────────────────────────────────────────────────

const u = new Union()
for (const c of raw) {
  const keys: string[] = []
  if (c.email) keys.push(`e:${c.email}`)
  if (c.phone.digits) keys.push(`p:${c.phone.digits}`)
  if (keys.length === 0 && c.contactName) keys.push(`n:${norm(c.contactName)}`)
  for (let i = 1; i < keys.length; i++) u.union(keys[0]!, keys[i]!)
}

const clusters = new Map<string, RawChild[]>()
const childKey = (c: RawChild) => `${c.group}|${norm(c.firstName)}|${norm(c.lastName)}`

for (const c of raw) {
  if (!c.contactName && !c.email && !c.phone.digits) continue
  const seed = c.email ? `e:${c.email}` : c.phone.digits ? `p:${c.phone.digits}` : `n:${norm(c.contactName)}`
  const root = u.find(seed)
  if (!clusters.has(root)) clusters.set(root, [])
  clusters.get(root)!.push(c)
}

const guardians: Guardian[] = []
let gid = 0
for (const [, members] of clusters) {
  const names = [...new Set(members.map((m) => m.contactName).filter(Boolean) as string[])]
  const emails = [...new Set(members.map((m) => m.email).filter(Boolean) as string[])]
  // A mobile first, then anything. Where a family has both a mobile and an old
  // landline on file, the mobile is the one that reaches a parent on a Sunday.
  const phones = [...new Set(members.map((m) => m.phone.digits).filter(Boolean) as string[])]
    .sort((a, b) => Number(isMobile(b)) - Number(isMobile(a)))
  const e164 = members.map((m) => m.phone.e164).find(Boolean) ?? null

  const issues: string[] = []
  if (names.length > 1) issues.push(`${names.length} name spellings: ${names.join(' / ')}`)
  if (emails.length > 1) issues.push(`${emails.length} email addresses: ${emails.join(' / ')}`)
  if (emails.length === 0) issues.push('no email')
  if (phones.length === 0) issues.push('no phone')
  for (const m of members) if (m.phone.issue) issues.push(`${m.phone.raw} — ${m.phone.issue}`)

  guardians.push({
    id: ++gid,
    name: names.sort((a, b) => b.length - a.length)[0] ?? '(unnamed)',
    nameVariants: names,
    emails, phones, e164,
    childKeys: members.map(childKey),
    issues: [...new Set(issues)],
  })
}

ok(`${guardians.length} distinct guardians`)

// ── Review queue ─────────────────────────────────────────────────────────────

type Review = { severity: 'blocker' | 'check' | 'note'; kind: string; detail: string }
const review: Review[] = []

for (const c of raw) {
  const who = `${c.firstName} ${c.lastName ?? ''}`.trim() + ` (${c.group})`
  if (!c.contactName && !c.email && !c.phone.digits)
    review.push({ severity: 'blocker', kind: 'No guardian at all', detail: `${who} — cannot be checked out` })
  else if (!c.email && !c.phone.digits)
    review.push({ severity: 'blocker', kind: 'Guardian unreachable', detail: `${who} → ${c.contactName}: no email, no phone` })
  else if (!c.lastName)
    review.push({ severity: 'check', kind: 'No surname', detail: `${who} → ${c.contactName ?? '?'}` })
  if (c.phone.issue?.includes('too long'))
    review.push({ severity: 'blocker', kind: 'Phone unrepairable', detail: `${who} → ${c.phone.raw} (${c.phone.issue})` })
}

// Same child on more than one sheet.
const byName = new Map<string, RawChild[]>()
for (const c of raw) {
  const k = `${norm(c.firstName)}|${norm(c.lastName)}`
  if (!norm(c.lastName)) continue
  if (!byName.has(k)) byName.set(k, [])
  byName.get(k)!.push(c)
}
for (const [, rows] of byName) {
  if (rows.length < 2) continue
  const groups = [...new Set(rows.map((r) => r.group))]
  if (groups.length > 1)
    review.push({
      severity: 'check', kind: 'Same child in two groups',
      detail: `${rows[0]!.firstName} ${rows[0]!.lastName} — ${rows.map((r) => `${r.group} (${r.attended.length} ticks)`).join(', ')}`,
    })
}

// Near-identical names sharing a guardian — the Julia / Juliet Trần case.
for (const g of guardians) {
  const kids = raw.filter((c) => g.childKeys.includes(childKey(c)))
  for (let i = 0; i < kids.length; i++)
    for (let j = i + 1; j < kids.length; j++) {
      const a = kids[i]!, b = kids[j]!
      if (norm(a.lastName) !== norm(b.lastName) || !norm(a.lastName)) continue
      const d = editDistance(norm(a.firstName), norm(b.firstName))
      if (d > 0 && d <= 2)
        review.push({
          severity: 'check', kind: 'Siblings or one child twice?',
          detail: `${a.firstName} ${a.lastName} (${a.group}) vs ${b.firstName} ${b.lastName} (${b.group}) — same guardian ${g.name}`,
        })
    }
}

for (const g of guardians)
  for (const iss of g.issues)
    if (iss.startsWith('2 email') || iss.includes('name spellings'))
      review.push({ severity: 'note', kind: 'Guardian merged', detail: `${g.name} — ${iss}` })

// Every imported pickup right is provisional until a human confirms it. These
// are notes rather than blockers on purpose — they should be worked through
// over the coming weeks, not before Sunday.
for (const g of guardians)
  review.push({
    severity: 'note',
    kind: 'Confirm pickup rights',
    detail: `${g.name} — carried over from the spreadsheet as authorised to collect ${new Set(g.childKeys).size} child(ren). Unconfirmed.`,
  })

const blockers = review.filter((r) => r.severity === 'blocker')
const checks = review.filter((r) => r.severity === 'check')

// Children whose recorded group disagrees with the grade they were given.
// Either the grade is wrong, or the child was deliberately placed off-grade —
// both worth a look, neither safe to resolve automatically.
for (const c of raw) {
  const hit = grades.get(gradeKey(c.firstName, c.lastName, c.group))
  if (!hit) continue
  const expectedLastYear = GRADE_TO_GROUP[hit.grade - 1]
  if (expectedLastYear && expectedLastYear !== c.group)
    review.push({
      severity: 'check', kind: 'Grade disagrees with sheet',
      detail: `${c.firstName} ${c.lastName ?? ''} — on the ${c.group} sheet, but grade ${hit.grade} implies they were in ${expectedLastYear} last year`,
    })
}

for (const c of provisional)
  review.push({
    severity: 'check', kind: `Provisional placement`,
    detail: `${c.firstName} ${c.lastName ?? ''} — held in ${c.group} for ${YEAR_CURR}, no grade on file`,
  })

const attendanceRows = raw.reduce((n, c) => n + c.attended.length, 0)
const sundays = [...new Set(raw.flatMap((c) => c.attended))].sort()
const sundaysPrev = sundays.filter((d) => d < ROLLOVER)
const sundaysCurr = sundays.filter((d) => d >= ROLLOVER)

ok(`${attendanceRows} attendance records across ${sundays.length} Sundays`)
info(`${sundaysPrev.length} Sundays in ${YEAR_PREV}, ${sundaysCurr.length} in ${YEAR_CURR} (split at ${ROLLOVER})`)

// A worksheet is still written as an escape hatch — if an admin would rather
// fill grades in bulk than tap through the app, they can. Optional, not a gate.
if (provisional.length && !COMMIT) {
  const wsPath = join(DATA_DIR, 'grade-worksheet.csv')
  const ws = ['First Name,Last Name,Group,Grade']
    .concat(
      provisional
        .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
          || a.firstName.localeCompare(b.firstName))
        .map((c) => `"${c.firstName}","${c.lastName ?? ''}","${c.group}",`),
    )
  writeFileSync(wsPath, ws.join('\n') + '\n', 'utf8')
  info(`optional bulk worksheet → ${wsPath} (${provisional.length} rows, not required)`)
}
if (blockers.length) warn(`${blockers.length} blockers — children who cannot be checked out`)
if (checks.length) warn(`${checks.length} need a human decision`)

// ── Report ───────────────────────────────────────────────────────────────────

const esc = (s: unknown) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))

// (group breakdown is rendered inline in the rollover tables below)

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>KidzQuest import preview</title>
<style>
body{font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;background:#f5f6f8;color:#151b26}
.wrap{max-width:1100px;margin:0 auto;padding:28px 22px 70px}
h1{font-size:22px;margin:0 0 4px} h2{font-size:16px;margin:30px 0 10px}
.sub{color:#6b7684;font-size:13px;margin-bottom:22px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:8px}
.c{background:#fff;border:1px solid #e3e7ed;border-radius:9px;padding:13px 15px}
.c .k{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7684;font-weight:700}
.c .v{font-size:26px;font-weight:700;margin-top:3px}
.c.bad .v{color:#c0392b} .c.warn .v{color:#b7791f}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e3e7ed;border-radius:9px;overflow:hidden}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7684;
   padding:9px 13px;background:#fafbfc;border-bottom:1px solid #e3e7ed}
td{padding:8px 13px;border-bottom:1px solid #eef1f4;vertical-align:top}
tr:last-child td{border-bottom:0}
.tag{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:20px}
.b{background:#fbeae8;color:#c0392b}.ch{background:#fdf3e2;color:#b7791f}.n{background:#eceff3;color:#5b6672}
.mono{font-family:ui-monospace,Menlo,monospace;font-size:12.5px}
.banner{background:${COMMIT ? '#fbeae8' : '#e8f2f6'};border:1px solid ${COMMIT ? '#f0c4c0' : '#c4dde7'};
  color:${COMMIT ? '#8c2b20' : '#14536b'};padding:11px 14px;border-radius:9px;margin-bottom:20px;font-size:13.5px}
</style></head><body><div class="wrap">
<h1>KidzQuest roster — import preview</h1>
<div class="sub">Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · ${esc(classFiles.join(', '))}</div>
<div class="banner">${COMMIT
  ? '<b>This was a COMMIT run.</b> The rows below were written to the database.'
  : '<b>Dry run — nothing was written.</b> Review this, then re-run with <code>--commit</code>.'}</div>

<div class="cards">
  <div class="c"><div class="k">Children</div><div class="v">${raw.length}</div></div>
  <div class="c"><div class="k">Guardians</div><div class="v">${guardians.length}</div></div>
  <div class="c"><div class="k">Attendance</div><div class="v">${attendanceRows}</div></div>
  <div class="c"><div class="k">Sundays</div><div class="v">${sundays.length}</div></div>
  <div class="c ${provisional.length ? 'warn' : ''}"><div class="k">Provisional</div><div class="v">${provisional.length}</div></div>
  <div class="c ${blockers.length ? 'bad' : ''}"><div class="k">Blockers</div><div class="v">${blockers.length}</div></div>
  <div class="c ${checks.length ? 'warn' : ''}"><div class="k">Need a decision</div><div class="v">${checks.length}</div></div>
</div>

<h2>Rollover — ${esc(YEAR_PREV)} → ${esc(YEAR_CURR)}</h2>
<div class="sub" style="margin:-4px 0 10px">
  KidzQuest moves up on the first Sunday of August. ${esc(ROLLOVER)} falls inside the
  imported span, so these sheets show <b>last year's</b> rooms.
</div>
<table><thead><tr><th>Group in ${esc(YEAR_PREV)}</th><th>Children</th><th>Confirmed</th><th>Provisional</th></tr></thead><tbody>
${GROUP_ORDER.filter((g) => byGroup.has(g)).map((g) => {
  const rows = byGroup.get(g)!
  const prov = rows.filter((c) => resolveNewYear(c).provisional).length
  return `<tr><td>${g}</td><td>${rows.length}</td><td>${rows.length - prov}</td>
    <td>${prov ? `<span class="tag ch">${prov}</span>` : '<span class="tag n">0</span>'}</td></tr>`
}).join('')}
</tbody></table>

<h2>Rooms for ${esc(YEAR_CURR)}</h2>
<div class="sub" style="margin:-4px 0 10px">
  Provisional children are held in the group they were already in. Roughly half
  will be wrong — teachers correct them in the app, one tap each.
</div>
<table><thead><tr><th>Group</th><th>Children</th><th>of which provisional</th></tr></thead><tbody>
${GROUP_ORDER.map((g) => {
  const inG = raw.filter((c) => resolveNewYear(c).group === g)
  if (!inG.length) return ''
  const prov = inG.filter((c) => resolveNewYear(c).provisional).length
  return `<tr><td>${g}</td><td>${inG.length}</td><td>${prov || '—'}</td></tr>`
}).join('')}
</tbody></table>

<h2>Needs attention (${review.length})</h2>
<table><thead><tr><th style="width:80px">Severity</th><th style="width:190px">Kind</th><th>Detail</th></tr></thead><tbody>
${review.sort((a, b) => (a.severity === 'blocker' ? -1 : b.severity === 'blocker' ? 1 : 0))
  .map((r) => `<tr><td><span class="tag ${r.severity === 'blocker' ? 'b' : r.severity === 'check' ? 'ch' : 'n'}">${r.severity}</span></td>
   <td>${esc(r.kind)}</td><td>${esc(r.detail)}</td></tr>`).join('')}
</tbody></table>

<h2>Guardians (${guardians.length})</h2>
<table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Children</th><th>Notes</th></tr></thead><tbody>
${guardians.sort((a, b) => a.name.localeCompare(b.name)).map((g) => `<tr>
  <td><b>${esc(g.name)}</b>${g.nameVariants.length > 1 ? `<div style="font-size:11.5px;color:#b7791f">also: ${esc(g.nameVariants.filter(n => n !== g.name).join(', '))}</div>` : ''}</td>
  <td class="mono">${esc(g.emails.join('<br>')) || '<span style="color:#c0392b">—</span>'}</td>
  <td class="mono">${esc(g.phones.join('<br>')) || '<span style="color:#c0392b">—</span>'}</td>
  <td>${g.childKeys.length}</td>
  <td style="font-size:12px;color:#6b7684">${esc(g.issues.join(' · '))}</td></tr>`).join('')}
</tbody></table>

<h2>Children (${raw.length})</h2>
<table><thead><tr><th>Name</th><th>Group</th><th>Sex</th><th>Guardian</th><th>Attended</th></tr></thead><tbody>
${raw.sort((a, b) => a.group.localeCompare(b.group) || a.firstName.localeCompare(b.firstName)).map((c) => `<tr>
  <td><b>${esc(c.firstName)}</b> ${esc(c.lastName ?? '')}${!c.lastName ? ' <span class="tag b">no surname</span>' : ''}</td>
  <td>${esc(c.group)}</td><td>${esc(c.gender ?? '—')}</td>
  <td>${c.contactName ? esc(c.contactName) : '<span class="tag b">none</span>'}</td>
  <td>${c.attended.length}</td></tr>`).join('')}
</tbody></table>
</div></body></html>`

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
const reportPath = join(DATA_DIR, 'import-preview.html')
writeFileSync(reportPath, html, 'utf8')
console.log('')
ok(`report → ${reportPath}`)

// ── Commit ───────────────────────────────────────────────────────────────────

if (!COMMIT) {
  console.log('')
  info('Dry run. Nothing written. Open the report, then re-run with --commit.')
  process.exit(0)
}

if (blockers.length) {
  console.log('')
  warn(`${blockers.length} blockers remain. Committing anyway — these children will`)
  warn('be created, but with no authorised collector, so check-out will refuse them.')
}

const { getPool, closePool, upsert } = await import('../src/lib/db')
const db = getPool()
const client = await db.connect()

try {
  await client.query('begin')

  const gIds = new Map<number, number>()
  for (const g of guardians) {
    const { rows } = await client.query<{ id: string }>(
      `insert into kq.guardians (full_name, email, phone, e164)
       values ($1,$2,$3,$4) returning id`,
      [g.name, g.emails[0] ?? null, g.phones[0] ?? null, g.e164],
    )
    gIds.set(g.id, parseInt(rows[0]!.id, 10))
  }
  ok(`guardians  ${gIds.size}`)

  const cIds = new Map<string, number>()
  for (const c of raw) {
    const { rows } = await client.query<{ id: string }>(
      `insert into kq.children (first_name, last_name, gender, source, active)
       values ($1,$2,$3,'excel',true) returning id`,
      [c.firstName, c.lastName ?? '', c.gender],
    )
    cIds.set(childKey(c), parseInt(rows[0]!.id, 10))
  }
  ok(`children   ${cIds.size}`)

  // Two enrolments per child, because the rollover falls inside the imported
  // span. The 2025-26 row is closed on the rollover date; the 2026-27 row is
  // opened the same day and is the one the station reads.
  let ePrev = 0, eCurr = 0
  for (const c of raw) {
    const dbC = cIds.get(childKey(c))!
    const next = resolveNewYear(c)

    // Last year — group is what the sheet recorded, which we trust. Grade is
    // back-derived from the new-year grade where we have one, else null.
    await client.query(
      `insert into kq.enrollments
         (child_id, academic_year, grade, group_code, started_on, ended_on, reason, note)
       values ($1,$2,$3,$4,$5,$6,'initial import',$7)`,
      [dbC, YEAR_PREV, next.grade === null ? null : next.grade - 1, c.group,
       sundaysPrev[0] ?? '2026-05-03', ROLLOVER,
       `from ${c.sheet}, row ${c.rowNo ?? '?'}`],
    )
    ePrev++

    // This year. Everyone gets a row — provisional where we had to assume.
    await client.query(
      `insert into kq.enrollments
         (child_id, academic_year, grade, group_code, started_on,
          reason, provisional, note)
       values ($1,$2,$3,$4,$5,'annual promotion',$6,$7)`,
      [dbC, YEAR_CURR, next.grade, next.group, ROLLOVER, next.provisional, next.note],
    )
    eCurr++
  }
  ok(`enrolments ${ePrev} in ${YEAR_PREV}, ${eCurr} in ${YEAR_CURR}`)
  info(`${provisional.length} of the ${YEAR_CURR} rows are provisional`)

  let links = 0
  for (const g of guardians) {
    const dbG = gIds.get(g.id)!
    for (const ck of new Set(g.childKeys)) {
      const dbC = cIds.get(ck)
      if (!dbC) continue
      // can_pickup = TRUE for the primary contact.
      //
      // The safer-looking choice is FALSE — a spreadsheet cell is not consent.
      // But FALSE means all 138 children need an override on the first Sunday,
      // not just the 26 with no guardian at all. A control that everybody
      // overrides on day one stops being a control by the second week, and the
      // habit outlives the import.
      //
      // The paper system already treats this person as the one who collects the
      // child. This carries that forward, marks it unconfirmed, and asks for
      // confirmation family by family rather than blocking the room.
      await client.query(
        `insert into kq.child_guardians (child_id, guardian_id, relationship, is_primary, can_pickup)
         values ($1,$2,'primary contact (unconfirmed)',true,true) on conflict do nothing`,
        [dbC, dbG],
      )
      links++
    }
  }
  ok(`links      ${links}`)

  // A session belongs to whichever group the child was actually in that day —
  // and that changes at the rollover. Filing a 17 May tick under this year's
  // group would report last year's Explorers as Voyagers.
  const sessIds = new Map<string, number>()
  const sessionFor = async (iso: string, grp: string): Promise<number> => {
    const k = `${iso}|${grp}`
    const cached = sessIds.get(k)
    if (cached) return cached
    const { rows } = await client.query<{ id: string }>(
      `insert into kq.sessions (service_date, group_code)
       values ($1,$2) on conflict (service_date, group_code, campus_id) do update
         set service_date = excluded.service_date returning id`,
      [iso, grp],
    )
    const id = parseInt(rows[0]!.id, 10)
    sessIds.set(k, id)
    return id
  }

  let att = 0
  for (const c of raw) {
    const dbC = cIds.get(childKey(c))!
    const next = resolveNewYear(c)

    for (const iso of c.attended) {
      // Before the rollover the child was in the sheet's group; on or after it,
      // in their new one.
      const grp = iso < ROLLOVER ? c.group : next.group
      const s = await sessionFor(iso, grp)
      // Historical rows: present, but no check-in time, no security code and no
      // named adult — because the spreadsheet never recorded any of that.
      await client.query(
        `insert into kq.attendance (session_id, child_id, status, source)
         values ($1,$2,'present','import') on conflict (session_id, child_id) do nothing`,
        [s, dbC],
      )
      att++
    }
  }
  ok(`sessions   ${sessIds.size}`)
  ok(`attendance ${att}`)

  for (const r of review)
    await client.query(
      `insert into kq.import_review (source, raw, match_confidence, match_notes, status)
       values ('excel', $1, $2, $3, 'pending')`,
      [JSON.stringify(r), r.severity === 'blocker' ? 'none' : 'probable', `${r.kind}: ${r.detail}`],
    )
  ok(`review     ${review.length}`)

  await client.query('commit')
  console.log('')
  ok('committed')
} catch (e) {
  await client.query('rollback')
  console.error(`\n  \x1b[31m✗\x1b[0m rolled back — ${e instanceof Error ? e.message : String(e)}`)
  process.exitCode = 1
} finally {
  client.release()
  await closePool()
}
