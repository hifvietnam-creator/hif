/**
 * scripts/reconcile-kq-september.ts
 *
 * Brings the database from 13 August up to 6 September.
 *
 * DRY RUN IS THE DEFAULT. Nothing is written unless you pass --commit.
 *
 *   pnpm reconcile:kq            parse, compare, write a report
 *   pnpm reconcile:kq --commit   then apply it
 *
 * Put the exports here:
 *   data/kq-sept/*.csv           the five class sheets and both Cognito files
 *
 * WHAT THIS IS RECONCILING
 *
 * The rooms carried on with paper through August and September, so the database
 * has nothing after 13 August. That makes the attendance side simple: four new
 * Sundays to add, and thirteen older ones already there.
 *
 * The roster side is not simple. The August import assumed a clean rollover and
 * moved all 31 Explorers up to Voyagers. The spreadsheets show that never
 * happened: Explorers still holds its original roster, a handful of children
 * were copied onto a new sheet, and the old rows were left behind. Several
 * children are now on two sheets with both still being ticked.
 *
 * So the database's current groups are wrong, and the sheets are only partly
 * right. What the sheets DO tell us reliably is where each child was actually
 * marked present, week by week, and that is what this uses.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DATA_DIR = resolve(ROOT, 'data', 'kq-sept')

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
const BATCH = '2026-09-09-september'
const TODAY = '2026-09-09'

const ok = (m: string) => console.log(`  \x1b[32m✓\x1b[0m ${m}`)
const warn = (m: string) => console.log(`  \x1b[33m⚠\x1b[0m ${m}`)
const info = (m: string) => console.log(`  \x1b[2m·\x1b[0m \x1b[2m${m}\x1b[0m`)

// ── CSV ──────────────────────────────────────────────────────────────────────

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
        if (src[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

const clean = (v: unknown): string | null => {
  if (v === null || v === undefined) return null
  const s = String(v).replace(/\s+/g, ' ').trim()
  return s === '' ? null : s
}

const norm = (v: string | null | undefined): string =>
  (v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

/** Vietnamese mobiles are 10 digits starting 03/05/07/08/09. */
function cleanPhone(v: unknown): { digits: string | null; e164: string | null; issue: string | null } {
  const raw = clean(v)
  if (!raw) return { digits: null, e164: null, issue: null }
  let d = raw.replace(/\D/g, '')
  let issue: string | null = null

  // Cognito gives +84…, 84… and bare local numbers in the same column.
  if (d.startsWith('84') && d.length >= 11) d = '0' + d.slice(2)
  if (d.length === 9) { d = '0' + d; issue = 'leading 0 restored' }

  const mobile = /^0[35789]/.test(d)
  if (d.length !== 10) issue = `${d.length} digits`
  else if (!mobile) issue = 'looks like a landline'

  const valid = d.length === 10 && mobile
  return { digits: d, e164: valid ? '+84' + d.slice(1) : null, issue }
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

/** '16-Aug' → '2026-08-16'. The sheets carry no year; the term is 2026. */
function sundayHeader(h: string): string | null {
  const m = clean(h)?.match(/^(\d{1,2})\s*[-/ ]\s*([A-Za-z]{3})/)
  if (!m) return null
  const mon = MONTHS[m[2]!.toLowerCase()]
  if (!mon) return null
  return `2026-${String(mon).padStart(2, '0')}-${String(parseInt(m[1]!, 10)).padStart(2, '0')}`
}

/** 'DD/MM/YYYY' → ISO, or null with a reason. */
function parseBirthday(v: unknown): { iso: string | null; issue: string | null } {
  const s = clean(v)
  if (!s) return { iso: null, issue: null }
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return { iso: null, issue: `unrecognised date "${s}"` }
  const [d, mo, y] = [parseInt(m[1]!, 10), parseInt(m[2]!, 10), parseInt(m[3]!, 10)]
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  // Four records carry a birth year of 2026 for children aged 5, 9 and 11.
  // The day and month are probably right and the year is a typo, but there is
  // no honest way to guess which year, so these are refused rather than fixed.
  if (iso > TODAY) return { iso: null, issue: `born in the future (${s})` }
  if (y < 2005) return { iso: null, issue: `too old to be in KidzQuest (${s})` }
  return { iso, issue: null }
}

// ── Groups ───────────────────────────────────────────────────────────────────

const GROUP_ORDER = ['explorers', 'voyagers', 'trailblazers', 'pathfinders']
const GROUP_BANDS: Record<string, number[]> = {
  explorers: [0],
  voyagers: [1, 2],
  trailblazers: [3, 4],
  pathfinders: [5, 6, 7],
}
/** grade → typical age on the first Sunday of August. */
const TYPICAL_AGE: Record<number, number> = { 0: 4, 1: 5, 2: 6, 3: 7, 4: 8, 5: 9, 6: 10, 7: 11 }

function groupFromBanner(rows: string[][]): string | null {
  const head = rows.slice(0, 4).flat().map(norm).join(' ')
  for (const g of GROUP_ORDER) if (head.includes(g)) return g
  return null
}

// ── Reading a class sheet ────────────────────────────────────────────────────

type SheetRow = {
  group: string
  sheet: string
  firstName: string
  lastName: string | null
  gender: string | null
  contactName: string | null
  email: string | null
  phone: ReturnType<typeof cleanPhone>
  attended: string[]
  lastSeen: string | null
}

function readSheet(path: string, filename: string): SheetRow[] {
  const rows = parseCsv(readFileSync(path, 'utf8'))

  // By banner, never by filename. Of the five files supplied, two were named
  // after the wrong group and one was not a class sheet at all.
  const group = groupFromBanner(rows)
  if (!group) return []

  const hIdx = rows.findIndex((r) => r.some((c) => norm(c) === 'first name'))
  if (hIdx === -1) return []
  const header = rows[hIdx]!
  const col = (n: string) => header.findIndex((c) => norm(c) === norm(n))

  const cFirst = col('First Name')
  const cLast = col('Last Name')
  const cGender = col('Gender')
  const cContact = col('Primary Contact Name')
  const cEmail = col('Email')
  const cPhone = col('Contact #')
  const cLoc = col('Location')

  const dates: { idx: number; iso: string }[] = []
  for (let i = cLoc + 1; i < header.length; i++) {
    const iso = sundayHeader(header[i] ?? '')
    if (iso) dates.push({ idx: i, iso })
  }

  const out: SheetRow[] = []
  for (let r = hIdx + 1; r < rows.length; r++) {
    const row = rows[r]!
    const firstName = clean(row[cFirst])
    if (!firstName) continue

    const attended = dates.filter((d) => norm(row[d.idx]) === 'yes').map((d) => d.iso)
    out.push({
      group,
      sheet: filename,
      firstName,
      lastName: clean(row[cLast]),
      gender: (() => {
        const g = norm(clean(row[cGender]))
        return g === 'male' ? 'Male' : g === 'female' ? 'Female' : null
      })(),
      contactName: clean(row[cContact]),
      email: clean(row[cEmail])?.toLowerCase() ?? null,
      phone: cleanPhone(row[cPhone]),
      attended,
      lastSeen: attended.length ? attended[attended.length - 1]! : null,
    })
  }
  return out
}

// ── Cognito ──────────────────────────────────────────────────────────────────

type CogKid = {
  familyId: string
  entryId: string
  firstName: string
  lastName: string
  gender: string | null
  birthday: string | null
  birthdayIssue: string | null
  ageGiven: number | null
  gradeGiven: number | null
  nationality: string | null
  nameOrderSuspect: boolean
}

type CogParent = {
  familyId: string
  name: string
  phone: ReturnType<typeof cleanPhone>
  email: string | null
  nationality: string | null
}

/**
 * Korean and Vietnamese families often put the family name in the first box.
 * Two siblings sharing a Name_First is the giveaway: siblings share a surname,
 * not a given name.
 */
function flagNameOrder(kids: CogKid[]): void {
  const byFamily = new Map<string, CogKid[]>()
  for (const k of kids) {
    if (!byFamily.has(k.familyId)) byFamily.set(k.familyId, [])
    byFamily.get(k.familyId)!.push(k)
  }
  for (const sibs of byFamily.values()) {
    if (sibs.length < 2) continue
    const firsts = new Set(sibs.map((s) => norm(s.firstName)))
    const lasts = new Set(sibs.map((s) => norm(s.lastName)))
    if (firsts.size === 1 && lasts.size > 1) for (const s of sibs) s.nameOrderSuspect = true
  }
}

function readCognitoKids(path: string): CogKid[] {
  const rows = parseCsv(readFileSync(path, 'utf8'))
  const header = rows[0]!
  const col = (n: string) => header.findIndex((c) => norm(c) === norm(n))

  const c = {
    fam: col('HIFKQ_Id'), id: col('KidsInformation_Id'),
    first: col('Name_First'), last: col('Name_Last'),
    gender: col('Gender'), age: col('Age'), bday: col('Birthday'),
    grade: col('Grade'), nat: col('Nationality'),
  }

  const out: CogKid[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!
    const first = clean(row[c.first])
    if (!first) continue
    const b = parseBirthday(row[c.bday])
    const gradeMatch = clean(row[c.grade])?.match(/^\s*(\d)/)

    out.push({
      familyId: clean(row[c.fam]) ?? '',
      entryId: clean(row[c.id]) ?? '',
      firstName: first,
      lastName: clean(row[c.last]) ?? '',
      gender: (() => {
        const g = norm(clean(row[c.gender]))
        return g === 'male' ? 'Male' : g === 'female' ? 'Female' : null
      })(),
      birthday: b.iso,
      birthdayIssue: b.issue,
      ageGiven: clean(row[c.age]) ? parseInt(clean(row[c.age])!, 10) : null,
      gradeGiven: gradeMatch ? parseInt(gradeMatch[1]!, 10) : null,
      nationality: clean(row[c.nat]),
      nameOrderSuspect: false,
    })
  }
  flagNameOrder(out)
  return out
}

function readCognitoParents(path: string): CogParent[] {
  const rows = parseCsv(readFileSync(path, 'utf8'))
  const header = rows[0]!
  // Columns are prefixed ParentGuardianInformation2_. Confirmed with the
  // ministry that this is the only guardian the form captures, despite the "2".
  const find = (suffix: string) =>
    header.findIndex((c) => norm(c).endsWith(norm(suffix)))

  const c = {
    // norm() strips underscores, so 'HIFKQ_Id' becomes 'hifkqid'. Comparing
    // against 'hifkq id' with a space never matched, every row was skipped for
    // want of a family id, and the file silently yielded nothing.
    fam: header.findIndex((h) => norm(h).startsWith('hifkq')),
    first: find('Name_First'), last: find('Name_Last'),
    phone: find('Phone'), email: find('Email'), nat: find('Nationality'),
  }

  if (c.fam === -1 || c.first === -1) {
    warn(`could not find the expected columns in the parents export`)
    info(`saw: ${header.filter(Boolean).join(', ')}`)
    return []
  }

  const out: CogParent[] = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!
    const fam = clean(row[c.fam])
    if (!fam) continue
    const name = [clean(row[c.first]), clean(row[c.last])].filter(Boolean).join(' ')
    if (!name) continue
    out.push({
      familyId: fam,
      name,
      phone: cleanPhone(row[c.phone]),
      email: clean(row[c.email])?.toLowerCase() ?? null,
      nationality: clean(row[c.nat]),
    })
  }
  return out
}

// ── Load ─────────────────────────────────────────────────────────────────────

console.log(`\n\x1b[1mKidzQuest September reconciliation\x1b[0m  (${COMMIT ? '\x1b[31mCOMMIT\x1b[0m' : 'dry run'})\n`)

if (!existsSync(DATA_DIR)) {
  console.error(`  Put the exports in ${DATA_DIR} first.`)
  process.exit(1)
}

const files = readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith('.csv'))

let sheetRows: SheetRow[] = []
const sheetsSeen = new Map<string, string>()
let cogKids: CogKid[] = []
let cogParents: CogParent[] = []

for (const f of files) {
  const path = join(DATA_DIR, f)
  const head = readFileSync(path, 'utf8').slice(0, 400)

  if (/KidsInformation_Id/i.test(head)) { cogKids = readCognitoKids(path); ok(`${f.padEnd(26)} ${cogKids.length} Cognito children`); continue }
  if (/ParentGuardianInformation/i.test(head)) { cogParents = readCognitoParents(path); ok(`${f.padEnd(26)} ${cogParents.length} Cognito families`); continue }

  const rows = readSheet(path, f)
  if (rows.length === 0) { info(`${f.padEnd(26)} skipped, not a class sheet`); continue }
  const g = rows[0]!.group
  if (sheetsSeen.has(g)) { warn(`${f} is ${g} again, already read from ${sheetsSeen.get(g)}`); continue }
  sheetsSeen.set(g, f)
  ok(`${f.padEnd(26)} ${String(rows.length).padStart(3)} children  [${g}]`)
  sheetRows = sheetRows.concat(rows)
}

console.log('')
const missingGroups = GROUP_ORDER.filter((g) => !sheetsSeen.has(g))
for (const g of missingGroups) warn(`NO SHEET FOR ${g.toUpperCase()}`)

// ── Resolve children across sheets ───────────────────────────────────────────
//
// A child on two sheets belongs to whichever one they were most recently
// marked on. Where the two are within three Sundays of each other, or neither
// has a mark, the import refuses to choose and records a conflict.

type Resolved = {
  key: string
  firstName: string
  lastName: string | null
  group: string
  rows: SheetRow[]
  attendance: Map<string, string>   // date → group it was marked under
  conflict: string | null
}

const byKey = new Map<string, SheetRow[]>()
for (const r of sheetRows) {
  const k = `${norm(r.firstName)}|${norm(r.lastName)}`
  if (!byKey.has(k)) byKey.set(k, [])
  byKey.get(k)!.push(r)
}

const THREE_WEEKS = 21 * 86400_000
const resolved: Resolved[] = []

for (const [key, rows] of byKey) {
  const groups = [...new Set(rows.map((r) => r.group))]
  let group = groups[0]!
  let conflict: string | null = null

  if (groups.length > 1) {
    const latest = rows
      .filter((r) => r.lastSeen)
      .sort((a, b) => (b.lastSeen! > a.lastSeen! ? 1 : -1))

    if (latest.length === 0) {
      conflict = `on ${groups.join(' and ')}, never marked on either`
      group = groups[groups.length - 1]!
    } else {
      group = latest[0]!.group
      const top = new Date(latest[0]!.lastSeen!).getTime()
      const rival = latest.find((r) => r.group !== group)
      if (rival && top - new Date(rival.lastSeen!).getTime() < THREE_WEEKS) {
        conflict = `marked on ${group} (${latest[0]!.lastSeen}) and ` +
                   `${rival.group} (${rival.lastSeen}) within three weeks`
      }
    }
  }

  // One row per Sunday. A child attended once, however many sheets say so.
  // Kept under the sheet it was marked on, so a May tick stays a May group.
  const attendance = new Map<string, string>()
  for (const r of rows) for (const d of r.attended) if (!attendance.has(d)) attendance.set(d, r.group)

  const first = rows.find((r) => r.group === group) ?? rows[0]!
  resolved.push({
    key, firstName: first.firstName, lastName: first.lastName,
    group, rows, attendance, conflict,
  })
}

const onTwoSheets = resolved.filter((r) => r.rows.length > 1)
const refused = resolved.filter((r) => r.conflict)

ok(`${resolved.length} distinct children across the sheets`)
if (onTwoSheets.length) warn(`${onTwoSheets.length} appear on more than one sheet`)
if (refused.length) warn(`${refused.length} of those need a person to decide`)

const allDates = [...new Set(sheetRows.flatMap((r) => r.attended))].sort()
const newDates = allDates.filter((d) => d > '2026-08-13')
ok(`${allDates.length} Sundays in the sheets, ${newDates.length} after the last import`)

// ── Match Cognito to the sheets ──────────────────────────────────────────────

type CogMatch = { kid: CogKid; child: Resolved | null; how: string; confident: boolean }
const cogMatches: CogMatch[] = []

const tokens = (s: string | null) => norm(s).split(' ').filter(Boolean)

/**
 * Cognito holds the full legal name, the sheets hold what a teacher writes on a
 * Sunday. Dashiell becomes Dash, Noah James Bauzon Custodio becomes Noah
 * Custodio, and a child whose surname nobody knew is just "Athena".
 *
 * Exact matching found 33 of 48 and missed every one of those. The rules below
 * are ordered by how much they can be trusted:
 *
 *   confident  the surname agrees and the given names clearly refer to one
 *              person. Details and guardians are applied.
 *   probable   the surname is missing from the sheet, or only the given name
 *              lines up. Reported for a human, nothing applied — attaching the
 *              wrong guardian to a child is the one mistake worth being slow
 *              about.
 */
function matchCognito(kid: CogKid): { child: Resolved | null; how: string; confident: boolean } {
  const kFirst = tokens(kid.firstName)
  const kLast = tokens(kid.lastName)
  const kAll = new Set([...kFirst, ...kLast])

  const exact = resolved.find((r) => r.key === `${norm(kid.firstName)}|${norm(kid.lastName)}`)
  if (exact) return { child: exact, how: 'name', confident: true }

  const reversed = resolved.find((r) => r.key === `${norm(kid.lastName)}|${norm(kid.firstName)}`)
  if (reversed) return { child: reversed, how: 'name reversed', confident: true }

  // Surname agrees, and one of the given names matches or is a shortening.
  const sameSurname = resolved.filter((r) => {
    const rLast = tokens(r.lastName)
    if (!rLast.length || !kLast.length) return false
    // "de Armas" against "de Arma": compare on the last token, which is where
    // the plural drifts, and accept either as a prefix of the other.
    const a = rLast[rLast.length - 1]!, b = kLast[kLast.length - 1]!
    return a === b || a.startsWith(b) || b.startsWith(a)
  })

  const byGiven = sameSurname.filter((r) =>
    tokens(r.firstName).some((t) => kFirst.some((k) => t === k || t.startsWith(k) || k.startsWith(t))),
  )
  if (byGiven.length === 1) return { child: byGiven[0]!, how: 'surname and given name', confident: true }

  // Sheet row has no surname at all. Common: the teacher only ever knew a
  // first name. Only accept when exactly one child on the sheets fits.
  //
  // The length check is not defensive padding. One Voyagers row has "??" as a
  // first name, which normalises to nothing, and [].every() is true — so that
  // single row matched every unmatched child on the register.
  const noSurname = resolved.filter((r) => {
    const rf = tokens(r.firstName)
    return !norm(r.lastName) && rf.length > 0 && rf.every((t) => kAll.has(t))
  })
  if (noSurname.length === 1) return { child: noSurname[0]!, how: 'given name, sheet has no surname', confident: false }

  // Last resort: every token on the sheet appears somewhere in the Cognito
  // name. Catches "Chanyoung (Chan) Park" against "Park Chanyoung".
  const overlap = resolved.filter((r) => {
    const rt = [...tokens(r.firstName), ...tokens(r.lastName)].filter((t) => t.length > 2)
    return rt.length >= 2 && rt.every((t) => kAll.has(t))
  })
  if (overlap.length === 1) return { child: overlap[0]!, how: 'all names appear, different order', confident: false }

  return { child: null, how: 'no match', confident: false }
}

for (const kid of cogKids) cogMatches.push({ kid, ...matchCognito(kid) })

const matched = cogMatches.filter((m) => m.child && m.confident)
const probable = cogMatches.filter((m) => m.child && !m.confident)
ok(`${matched.length} of ${cogKids.length} Cognito children matched confidently`)
if (probable.length) warn(`${probable.length} probable matches, not applied without a look`)

// ── Derive grade ─────────────────────────────────────────────────────────────
//
// Cognito's Grade field is unusable: a large share of parents left the first
// dropdown option selected, so eleven year olds are recorded as pre-school. It
// is read only to report the disagreement, never to place a child.
//
// Group + birthday is better. The group gives the band, the birthday narrows it
// within the band, and where the two disagree nobody gets a guess.

const ROLLOVER = new Date('2026-08-02')
function deriveGrade(group: string, birthday: string | null): { grade: number | null; why: string } {
  const band = GROUP_BANDS[group]
  if (!band) return { grade: null, why: 'unknown group' }
  if (band.length === 1) return { grade: band[0]!, why: 'group has one grade' }
  if (!birthday) return { grade: null, why: 'no birthday' }

  const age = Math.floor((ROLLOVER.getTime() - new Date(birthday).getTime()) / (365.25 * 86400_000))
  const candidate = band.find((g) => TYPICAL_AGE[g] === age)
  if (candidate !== undefined) return { grade: candidate, why: `age ${age} at the rollover` }
  return { grade: null, why: `age ${age} does not fit ${group}` }
}

// ── Conflicts worth a person ─────────────────────────────────────────────────

type Conflict = { kind: string; name: string; detail: string }
const conflicts: Conflict[] = []

for (const r of refused)
  conflicts.push({ kind: 'two_sheets', name: `${r.firstName} ${r.lastName ?? ''}`.trim(), detail: r.conflict! })

// A register cell holding "??" or a single initial is somebody's note to
// themselves, not a name. Left alone it becomes a child record called "??"
// that nobody can ever match a registration to.
for (const r of resolved) {
  const f = norm(r.firstName)
  if (f.length === 0 || (f.length <= 2 && !norm(r.lastName)))
    conflicts.push({
      kind: 'no_longer_listed',
      name: `"${r.firstName.trim()}" on the ${r.group} sheet`,
      detail: `not a usable name, marked present ${r.attendance.size} time(s). ` +
              `Somebody in that room will know who this is.`,
    })
}

for (const m of cogMatches) {
  const n = `${m.kid.firstName} ${m.kid.lastName}`.trim()
  if (m.kid.birthdayIssue)
    conflicts.push({ kind: 'impossible_birthday', name: n, detail: m.kid.birthdayIssue })
  if (m.kid.nameOrderSuspect)
    conflicts.push({ kind: 'name_order', name: n, detail: 'siblings share a first name, so the name boxes are probably swapped' })
  if (!m.child)
    conflicts.push({ kind: 'no_longer_listed', name: n, detail: 'registered with Cognito but not on any sheet' })
  else if (!m.confident)
    conflicts.push({
      kind: 'no_longer_listed', name: n,
      detail: `probably ${`${m.child.firstName} ${m.child.lastName ?? ''}`.trim()} ` +
              `on the ${m.child.group} sheet (${m.how}). Nothing applied until somebody confirms it.`,
    })
  if (m.child && m.kid.gradeGiven !== null) {
    const band = GROUP_BANDS[m.child.group] ?? []
    if (!band.includes(m.kid.gradeGiven))
      conflicts.push({
        kind: 'grade_mismatch', name: n,
        detail: `form says grade ${m.kid.gradeGiven}, but they are marked on the ${m.child.group} sheet` +
                (m.kid.ageGiven ? ` and the same form gives their age as ${m.kid.ageGiven}` : ''),
      })
  }
}

// Two submissions from one family, same phone.
const byPhone = new Map<string, CogParent[]>()
for (const p of cogParents) {
  if (!p.phone.digits) continue
  if (!byPhone.has(p.phone.digits)) byPhone.set(p.phone.digits, [])
  byPhone.get(p.phone.digits)!.push(p)
}
for (const [phone, ps] of byPhone) {
  if (ps.length < 2) continue
  conflicts.push({
    kind: 'duplicate_family', name: ps[0]!.name,
    detail: `${ps.length} registrations share ${phone}: ${ps.map((p) => `${p.name} <${p.email ?? 'no email'}>`).join(', ')}`,
  })
}

warn(`${conflicts.length} things need a person to look at`)

// ── Compare with the database ────────────────────────────────────────────────

const { getPool, closePool } = await import('../src/lib/db')
const db = getPool()

const { rows: dbChildren } = await db.query<{
  id: string; first_name: string; last_name: string
  group_code: string | null; enrollment_id: string | null
  birthdate: Date | null; grade: number | null; status: string
}>(
  `select c.id, c.first_name, c.last_name, c.birthdate, c.status,
          e.id as enrollment_id, e.group_code, e.grade
     from kq.children c
     left join lateral (
       select id, group_code, grade from kq.enrollments
        where child_id = c.id and ended_on is null
        order by started_on desc limit 1
     ) e on true`,
)

const dbByKey = new Map<string, (typeof dbChildren)[number]>()
for (const c of dbChildren) dbByKey.set(`${norm(c.first_name)}|${norm(c.last_name)}`, c)

const { rows: dbDates } = await db.query<{ d: Date }>(
  `select distinct s.service_date as d
     from kq.attendance a join kq.sessions s on s.id = a.session_id`,
)
const haveDates = new Set(dbDates.map((r) => r.d.toISOString().slice(0, 10)))

// What changes
const newChildren = resolved.filter((r) => !dbByKey.has(r.key))
const groupMoves: { r: Resolved; from: string }[] = []
let attendanceToAdd = 0

for (const r of resolved) {
  const existing = dbByKey.get(r.key)
  if (existing && existing.group_code && existing.group_code !== r.group)
    groupMoves.push({ r, from: existing.group_code })
  for (const d of r.attendance.keys()) if (!haveDates.has(d) || d > '2026-08-13') attendanceToAdd++
}

const goneFromSheets = dbChildren.filter(
  (c) => c.status === 'active' && !byKey.has(`${norm(c.first_name)}|${norm(c.last_name)}`),
)

console.log('')
ok(`${dbChildren.length} children in the database`)
ok(`${newChildren.length} on the sheets that the database has never seen`)
ok(`${groupMoves.length} in a different group than the database thinks`)
ok(`${attendanceToAdd} attendance marks to add`)
if (goneFromSheets.length) warn(`${goneFromSheets.length} in the database but on no sheet`)

// ── Report ───────────────────────────────────────────────────────────────────

const esc = (s: unknown) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]!))

const kindLabel: Record<string, string> = {
  two_sheets: 'On two sheets',
  grade_mismatch: 'Form grade disagrees',
  impossible_birthday: 'Birthday impossible',
  name_order: 'Names may be swapped',
  duplicate_family: 'Family registered twice',
  no_longer_listed: 'Registered but not on a sheet',
}

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="color-scheme" content="light"><title>September reconciliation</title><style>
body{font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:0;
  background:#F6F4F1;color:#1A1B1E}
.wrap{max-width:1080px;margin:0 auto;padding:26px 22px 70px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:30px 0 10px}
.sub{color:#6B6E74;font-size:13px;margin-bottom:20px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.c{background:#fff;border:1px solid #E7E4DF;border-radius:9px;padding:13px 15px}
.c .k{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6B6E74;font-weight:700}
.c .v{font-size:26px;font-weight:700;margin-top:3px}
.c.bad .v{color:#C01E27}.c.warn .v{color:#B7791F}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #E7E4DF;
  border-radius:9px;overflow:hidden;margin-top:8px}
th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6B6E74;
  padding:9px 13px;background:#FAFBFC;border-bottom:1px solid #E7E4DF}
td{padding:8px 13px;border-bottom:1px solid #EEF1F4;vertical-align:top}
tr:last-child td{border-bottom:0}
.tag{font-size:10.5px;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap}
.t-red{background:#FBECEC;color:#9C171E}.t-amb{background:#FDF3E2;color:#B7791F}
.t-grey{background:#ECEFF3;color:#5B6672}
.banner{background:${COMMIT ? '#FBECEC' : '#E8F4F8'};border:1px solid ${COMMIT ? '#F0C4C0' : '#C4DDE7'};
  color:${COMMIT ? '#8C2B20' : '#14536B'};padding:11px 14px;border-radius:9px;margin-bottom:20px}
</style></head><body><div class="wrap">
<h1>September reconciliation</h1>
<div class="sub">Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} · batch ${BATCH}</div>
${missingGroups.length ? `<div class="banner" style="background:#FBECEC;border-color:#F0C4C0;color:#8C2B20">
  <b>Stop. No sheet was found for ${missingGroups.map(esc).join(' and ')}.</b><br>
  Every child in ${missingGroups.length > 1 ? 'those groups' : 'that group'} will appear
  below as &ldquo;in the database, on no sheet&rdquo;, and none of their attendance has been
  read. That is a missing file, not children who have left.<br><br>
  Check the folder. The class sheets are identified by the banner inside them, so a file
  named after the wrong group is fine, but a file that is a mailing list rather than a
  register will be skipped.
</div>` : ''}
<div class="banner">${COMMIT
  ? '<b>This was a COMMIT run.</b> The changes below were written.'
  : '<b>Dry run. Nothing was written.</b> Read this, then re-run with <code>--commit</code>.'}</div>

<div class="cards">
  <div class="c"><div class="k">Children on sheets</div><div class="v">${resolved.length}</div></div>
  <div class="c"><div class="k">In the database</div><div class="v">${dbChildren.length}</div></div>
  <div class="c ${newChildren.length ? 'warn' : ''}"><div class="k">New to us</div><div class="v">${newChildren.length}</div></div>
  <div class="c ${groupMoves.length ? 'warn' : ''}"><div class="k">Group changes</div><div class="v">${groupMoves.length}</div></div>
  <div class="c"><div class="k">Marks to add</div><div class="v">${attendanceToAdd}</div></div>
  <div class="c ${conflicts.length ? 'bad' : ''}"><div class="k">Need a person</div><div class="v">${conflicts.length}</div></div>
</div>

<h2>What was read</h2>
<div class="sub" style="margin:-4px 0 0">Files are identified by the banner inside them, never by
their name. Two of the September exports were named after the wrong group.</div>
<table><thead><tr><th style="width:220px">Group</th><th>File</th><th style="width:110px">Children</th></tr></thead><tbody>
${GROUP_ORDER.map((g) => {
  const f = sheetsSeen.get(g)
  const n = sheetRows.filter((r) => r.group === g).length
  return `<tr><td><b>${esc(g)}</b></td>
    <td>${f ? esc(f) : '<span class="tag t-red">no file found</span>'}</td>
    <td>${f ? n : '—'}</td></tr>`
}).join('')}
<tr><td><b>Cognito children</b></td><td>${cogKids.length ? 'read' : '<span class="tag t-red">missing</span>'}</td><td>${cogKids.length}</td></tr>
<tr><td><b>Cognito families</b></td><td>${cogParents.length ? 'read' : '<span class="tag t-red">missing</span>'}</td><td>${cogParents.length}</td></tr>
</tbody></table>

<h2>Group changes (${groupMoves.length})</h2>
<div class="sub" style="margin:-4px 0 0">The database was told in August that everyone moved up.
The sheets show where children were actually marked.</div>
<table><thead><tr><th>Child</th><th>Database says</th><th>Sheets say</th><th>Last marked</th></tr></thead><tbody>
${groupMoves.slice(0, 200).map(({ r, from }) => `<tr>
  <td><b>${esc(r.firstName)} ${esc(r.lastName ?? '')}</b></td>
  <td><span class="tag t-grey">${esc(from)}</span></td>
  <td><span class="tag t-amb">${esc(r.group)}</span></td>
  <td>${esc([...r.attendance.keys()].sort().pop() ?? 'never')}</td></tr>`).join('')}
</tbody></table>

<h2>Needs a person (${conflicts.length})</h2>
<table><thead><tr><th style="width:200px">What</th><th style="width:190px">Who</th><th>Detail</th></tr></thead><tbody>
${conflicts.map((c) => `<tr>
  <td><span class="tag ${c.kind === 'two_sheets' || c.kind === 'impossible_birthday' ? 't-red' : 't-amb'}">${esc(kindLabel[c.kind] ?? c.kind)}</span></td>
  <td>${esc(c.name)}</td><td>${esc(c.detail)}</td></tr>`).join('')}
</tbody></table>

<h2>New children (${newChildren.length})</h2>
<table><thead><tr><th>Name</th><th>Group</th><th>Marked on</th></tr></thead><tbody>
${newChildren.map((r) => `<tr><td><b>${esc(r.firstName)} ${esc(r.lastName ?? '')}</b></td>
  <td>${esc(r.group)}</td><td>${r.attendance.size}</td></tr>`).join('')}
</tbody></table>

<h2>In the database, on no sheet (${goneFromSheets.length})</h2>
<div class="sub" style="margin:-4px 0 0">Not archived automatically. Some will have left, some are
name spellings that did not line up.</div>
<table><thead><tr><th>Name</th><th>Group</th></tr></thead><tbody>
${goneFromSheets.map((c) => `<tr><td>${esc(c.first_name)} ${esc(c.last_name)}</td>
  <td>${esc(c.group_code ?? '—')}</td></tr>`).join('')}
</tbody></table>
</div></body></html>`

const reportPath = join(DATA_DIR, 'reconciliation-preview.html')
writeFileSync(reportPath, html, 'utf8')
console.log('')
ok(`report → ${reportPath}`)

if (!COMMIT) {
  console.log('')
  info('Dry run. Nothing written. Open the report, then re-run with --commit.')
  await closePool()
  process.exit(0)
}

// A whole group with no sheet is a missing file, not an empty room. Committing
// would leave every child in it stranded in a stale group with none of their
// attendance loaded, and they would show up as candidates to archive. Refuse.
if (missingGroups.length) {
  console.log('')
  warn(`Refusing to commit: no sheet for ${missingGroups.join(', ')}.`)
  warn('Every child in those groups would be left behind. Add the file and re-run.')
  await closePool()
  process.exit(1)
}

// Same reasoning for the registration form. A parents file that parsed to
// nothing means no guardian is linked to anybody, and the children who most
// need one would look exactly as they did before.
if (cogKids.length > 0 && cogParents.length === 0) {
  console.log('')
  warn('Refusing to commit: the Cognito children parsed but the families did not.')
  warn('No guardian would be linked to any child. Check the parents export.')
  await closePool()
  process.exit(1)
}

// ── Commit ───────────────────────────────────────────────────────────────────

const client = await db.connect()
try {
  await client.query('begin')

  const idFor = new Map<string, number>()
  for (const [k, c] of dbByKey) idFor.set(k, parseInt(c.id, 10))

  // New children.
  //
  // A row whose name normalises to nothing — "??" — is a placeholder somebody
  // left in the register, not a child. Creating it would put an unmatchable
  // record on the roster forever. Skipped, unless it carries attendance, in
  // which case a real child was marked present under it and losing that would
  // be worse than an odd name on a list.
  let created = 0, skipped = 0
  for (const r of newChildren) {
    if (norm(r.firstName).length === 0 && r.attendance.size === 0) { skipped++; continue }

    const src = r.rows.find((x) => x.gender) ?? r.rows[0]!
    const { rows } = await client.query<{ id: string }>(
      `insert into kq.children (first_name, last_name, gender, source, status)
       values ($1,$2,$3,'excel','active') returning id`,
      [r.firstName, r.lastName ?? '', src.gender],
    )
    idFor.set(r.key, parseInt(rows[0]!.id, 10))
    created++
  }
  ok(`children created ${created}`)
  if (skipped) info(`${skipped} placeholder row(s) skipped, no name and no attendance`)

  // Groups. Close the open enrolment and open one in the group the sheets show.
  const { rows: yearRow } = await client.query<{ code: string }>(
    `select code from kq.academic_years where is_current limit 1`,
  )
  const year = yearRow[0]?.code ?? '2026-27'

  let moved = 0
  for (const r of resolved) {
    const childId = idFor.get(r.key)
    if (!childId) continue
    const existing = dbByKey.get(r.key)
    if (existing?.group_code === r.group) continue

    const cog = cogMatches.find((m) => m.child?.key === r.key)?.kid ?? null
    const { grade } = deriveGrade(r.group, cog?.birthday ?? null)

    await client.query(
      `update kq.enrollments set ended_on = current_date
        where child_id = $1 and ended_on is null`,
      [childId],
    )
    await client.query(
      `insert into kq.enrollments
         (child_id, academic_year, grade, group_code, started_on, reason, provisional, note)
       values ($1,$2,$3,$4,current_date,'mid-year move',$5,$6)`,
      [childId, year, grade, r.group, grade === null,
       `September reconciliation: marked on the ${r.group} sheet`],
    )
    moved++
  }
  ok(`group changes ${moved}`)

  // Cognito details
  let detailed = 0
  for (const m of matched) {
    const childId = idFor.get(m.child!.key)
    if (!childId) continue
    await client.query(
      `update kq.children
          set birthdate        = coalesce($2::date, birthdate),
              gender           = coalesce(gender, $3),
              nationality      = coalesce($4, nationality),
              cognito_entry_id = coalesce(cognito_entry_id, $5),
              cognito_family_id= coalesce($6, cognito_family_id)
        where id = $1`,
      [childId, m.kid.birthday, m.kid.gender, m.kid.nationality, m.kid.entryId, m.kid.familyId],
    )
    detailed++
  }
  ok(`details filled ${detailed}`)

  // Guardians from the registration form. `matched` only, never `probable` —
  // a guardian link is permission to take a child home, so a match that needs
  // confirming waits for it.
  let guardians = 0
  for (const p of cogParents) {
    const kids = matched.filter((m) => m.kid.familyId === p.familyId)
    if (kids.length === 0) continue

    let gid: number | null = null
    const { rows: found } = await client.query<{ id: string }>(
      `select id from kq.guardians
        where ($1::citext is not null and email = $1::citext)
           or ($2::text is not null and (phone = $2 or e164 = $3)) limit 1`,
      [p.email, p.phone.digits, p.phone.e164],
    )
    if (found[0]) gid = parseInt(found[0].id, 10)
    else {
      const { rows } = await client.query<{ id: string }>(
        `insert into kq.guardians (full_name, email, phone, e164)
         values ($1,$2,$3,$4) returning id`,
        [p.name, p.email, p.phone.digits, p.phone.e164],
      )
      gid = parseInt(rows[0]!.id, 10)
    }

    for (const k of kids) {
      const childId = idFor.get(k.child!.key)
      if (!childId) continue
      await client.query(
        `insert into kq.child_guardians (child_id, guardian_id, relationship, is_primary, can_pickup)
         values ($1,$2,'registered on the form',true,true)
         on conflict (child_id, guardian_id) do nothing`,
        [childId, gid],
      )
      guardians++
    }
  }
  ok(`guardian links ${guardians}`)

  // Attendance
  const sessionFor = new Map<string, number>()
  const getSession = async (iso: string, grp: string) => {
    const k = `${iso}|${grp}`
    const hit = sessionFor.get(k)
    if (hit) return hit
    const { rows } = await client.query<{ id: string }>(
      `insert into kq.sessions (service_date, group_code) values ($1,$2)
       on conflict (service_date, group_code, (coalesce(campus_id, 0)))
         do update set service_date = excluded.service_date returning id`,
      [iso, grp],
    )
    const id = parseInt(rows[0]!.id, 10)
    sessionFor.set(k, id)
    return id
  }

  let marks = 0
  for (const r of resolved) {
    const childId = idFor.get(r.key)
    if (!childId) continue
    for (const [iso, grp] of r.attendance) {
      const sid = await getSession(iso, grp)
      const res = await client.query(
        `insert into kq.attendance (session_id, child_id, status, source, import_batch)
         values ($1,$2,'present','import',$3)
         on conflict (session_id, child_id) do nothing`,
        [sid, childId, BATCH],
      )
      marks += res.rowCount ?? 0
    }
  }
  ok(`attendance added ${marks}`)

  // Conflicts
  for (const c of conflicts)
    await client.query(
      `insert into kq.sheet_conflicts (child_name, groups_seen, last_seen, kind, detail)
       values ($1, $2, $3, $4, $5)`,
      [c.name, [], JSON.stringify({}), c.kind, c.detail],
    )
  ok(`conflicts recorded ${conflicts.length}`)

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
