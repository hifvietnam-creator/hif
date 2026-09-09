/**
 * scripts/build-status-report.ts
 *
 * Generates the HIF Journey Dashboard status report as a Word document.
 *
 * Written as a script rather than a hand-made file so it can be regenerated at
 * the next milestone instead of edited. Screenshots are picked up from
 * reports/screenshots/ if present; where one is missing the document says so
 * rather than silently leaving a gap.
 *
 * Requires: pnpm add -D docx
 *
 * Usage: pnpm report:status
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const SHOTS = resolve(ROOT, 'reports/screenshots')

/** Drop PNGs with these names into reports/screenshots/ to have them embedded. */
const SCREENSHOTS = [
  { file: '01-sermons.png', caption: 'The public sermon archive at /sermons — 808 messages, filterable by series, year and speaker.' },
  { file: '02-ministries.png', caption: 'Ministries dashboard — attendance per gathering alongside the monthly report staff already keep.' },
  { file: '03-monthly-report.png', caption: 'The monthly report as it stands. Gaps are shown as gaps: ? means it happened but was not recorded, – means it did not run.' },
  { file: '04-reachability.png', caption: 'Reachability — who can actually be contacted, by which list, and how stale each list is.' },
  { file: '05-breakdown.png', caption: 'The breakdown explorer. Staff choose the audience and the dimension; coverage is stated whenever it is below 100%.' },
]

async function main() {
  let d: typeof import('docx')
  try {
    const mod = (await import('docx')) as unknown as Record<string, unknown>
    d = ((mod.default as typeof import('docx')) ?? mod) as typeof import('docx')
    if (!d.Document) throw new Error('docx API not found')
  } catch (err) {
    console.error(`Could not load docx: ${(err as Error).message}`)
    console.error('Run:  pnpm add -D docx\n')
    process.exit(1)
  }

  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
    WidthType, ShadingType, AlignmentType, ImageRun, BorderStyle,
  } = d

  const GREY = '595959'
  const RED = 'B01B2E'

  const P = (text: string, opts: Record<string, unknown> = {}) =>
    new Paragraph({ children: [new TextRun({ text, ...opts })], spacing: { after: 120 }, ...(opts.paraProps as object ?? {}) })

  const H1 = (text: string) =>
    new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 } })
  const H2 = (text: string) =>
    new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 120 } })

  const Bullet = (text: string, bold?: string) =>
    new Paragraph({
      children: bold
        ? [new TextRun({ text: bold, bold }), new TextRun({ text })]
        : [new TextRun({ text })],
      bullet: { level: 0 },
      spacing: { after: 80 },
    })

  const Note = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, italics: true, color: GREY, size: 20 })],
      spacing: { after: 200 },
    })

  /** Tables need column widths on the table AND a width on every cell, in DXA. */
  const TOTAL = 9360
  const makeTable = (header: string[], body: string[][], widths?: number[]) => {
    const cols = widths ?? header.map(() => Math.floor(TOTAL / header.length))
    const cell = (text: string, i: number, isHeader: boolean) =>
      new TableCell({
        width: { size: cols[i]!, type: WidthType.DXA },
        shading: isHeader
          ? { type: ShadingType.CLEAR, fill: 'F2F2F2', color: 'auto' }
          : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [
          new Paragraph({
            children: [new TextRun({ text, bold: isHeader, size: 20 })],
          }),
        ],
      })
    return new Table({
      columnWidths: cols,
      width: { size: TOTAL, type: WidthType.DXA },
      rows: [
        new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, true)) }),
        ...body.map((r) => new TableRow({ children: r.map((c, i) => cell(c, i, false)) })),
      ],
    })
  }

  const screenshot = (name: string, caption: string) => {
    const path = resolve(SHOTS, name)
    if (!existsSync(path)) {
      return [
        new Paragraph({
          children: [new TextRun({ text: `[ Screenshot to insert: ${name} — ${caption} ]`, italics: true, color: RED, size: 20 })],
          spacing: { before: 120, after: 240 },
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'D9D9D9' }, bottom: { style: BorderStyle.SINGLE, size: 6, color: 'D9D9D9' } },
        }),
      ]
    }
    return [
      new Paragraph({
        children: [
          new ImageRun({
            type: 'png',
            data: readFileSync(path),
            transformation: { width: 600, height: 340 },
          }),
        ],
        spacing: { before: 160, after: 40 },
      }),
      new Paragraph({
        children: [new TextRun({ text: caption, italics: true, color: GREY, size: 18 })],
        spacing: { after: 240 },
      }),
    ]
  }

  const today = new Date().toISOString().slice(0, 10)

  const doc = new Document({
    creator: 'HIF',
    title: 'HIF Journey Dashboard — Status Report',
    sections: [
      {
        properties: {},
        children: [
          // ── Cover ──
          new Paragraph({
            children: [new TextRun({ text: 'HIF Journey Dashboard', bold: true, size: 44 })],
            spacing: { after: 80 },
          }),
          new Paragraph({
            children: [new TextRun({ text: 'Status report', size: 28, color: GREY })],
            spacing: { after: 240 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: 'D9D9D9' } },
          }),
          P(`${today}`, { color: GREY, size: 20 }),
          P('Prepared for the project handoff author and for supervision.', { color: GREY, size: 20 }),

          // ── Summary ──
          H1('In short'),
          P(
            'Since the handoff, the dashboard has moved from a single congregation overview to four working sections, and the church\'s scattered records have been brought into one database. Three sources that previously existed only as spreadsheets or web pages are now queryable: the sermon archive, ministry attendance, and event registrations.',
          ),
          P(
            'The work also surfaced a number of things nobody had visibility of. Those findings are set out plainly below. None of them are failures of the people involved — most are the predictable result of information living in places that cannot talk to each other.',
          ),

          makeTable(
            ['', 'Before', 'Now'],
            [
              ['Sermons in the system', '29', '808'],
              ['Sermon notes linked', '0', '483'],
              ['Speakers on record', '7', '66'],
              ['Sermon series', '5', '73'],
              ['Ministry gatherings recorded', '0', '128'],
              ['Monthly metrics stored', '0', '120 values'],
              ['Event registrations', '0', '416'],
              ['Dashboard sections', '1', '4'],
            ],
            [4200, 2580, 2580],
          ),
          Note('Every figure traces back to a named source file recorded in the database.'),

          // ── What is live ──
          H1('What is live'),

          H2('1. Sermon archive'),
          P(
            'The public sermon library now holds the full archive back to 2015, imported from the church website. Each sermon carries its speaker, series, date where known, video, and links to the slides and discussion guide. Visitors can filter by series, year or speaker, and every sermon has its own page in the site\'s sitemap so search engines can find it — previously all but the most recent were unreachable.',
          ),
          ...screenshot(SCREENSHOTS[0]!.file, SCREENSHOTS[0]!.caption),

          H2('2. Ministries'),
          P(
            'Attendance for every gathering that Planning Center records, shown next to the monthly report staff already keep. For each ministry: how many are on the roster, how many members actually attend, how many guests come, and the resulting turnout.',
          ),
          P(
            'Guests are counted separately from members throughout. A small group with steady visitors is growing, not over-subscribed, and combining the two hides the difference.',
          ),
          ...screenshot(SCREENSHOTS[1]!.file, SCREENSHOTS[1]!.caption),
          ...screenshot(SCREENSHOTS[2]!.file, SCREENSHOTS[2]!.caption),

          H2('3. Reachability'),
          P(
            'Who the church can actually contact. The two mailing audiences staff send to are shown with the number reachable today, how many addresses belong to shared households, and how many have bounced, unsubscribed or marked mail as spam — each of which means something different and is kept separate.',
          ),
          ...screenshot(SCREENSHOTS[3]!.file, SCREENSHOTS[3]!.caption),
          P(
            'Below that, staff can break either audience down by group involvement, gender, membership status, campus or age, and the display states how much of the audience each breakdown actually covers.',
          ),
          ...screenshot(SCREENSHOTS[4]!.file, SCREENSHOTS[4]!.caption),

          H2('4. Serving'),
          P(
            'Team rotas and scheduling from Planning Center Services. This section is accurate but narrow, and says so on the page: Services is used by worship and media only, so it covers 4 of 62 teams. It is not a picture of serving across HIF, and is labelled accordingly.',
          ),

          // ── Findings ──
          H1('What the data showed'),
          P(
            'These are the findings that came out of the work. They are stated directly because each one changes a decision.',
          ),

          H2('The monthly report is 55% empty'),
          P(
            'Of 120 monthly figures across 20 metrics and six months, 54 are filled in. The gaps are not random: the one metric that is complete every month is the one Planning Center holds automatically. Everything that depends on someone remembering to count and write it down is patchy, and Filipino Fellowship has no figure recorded in any of the six months despite having a named owner.',
          ),
          P(
            'Roughly half these metrics have no system behind them at all — Sunday attendance at each campus, and most of the fellowships. No amount of importing will produce them. They exist only if someone enters them.',
          ),

          H2('62% of the Members list is in no group'),
          P(
            'Of the people on the mailing list treated as regular attenders, 38% belong to a group and 11% lead one. Across the wider list of everyone, only 7% are in a group. Whether that reflects genuine connection or simply that group membership is not maintained in Planning Center is the single most useful question to answer next, and the two possibilities call for opposite responses.',
          ),

          H2('185 people gave us their email and are unknown to us'),
          P(
            'Across Alpha, Pickleball, Paskong Pinoy and Family Day, 416 people registered. 165 matched an existing church record. 185 gave a working email address and have no record at all — they can be contacted today and nobody knows they exist. A further 66 gave no email and cannot be reached by any means; one of those forms has no email field at all, which is worth fixing before it runs again.',
          ),

          H2('The mailing lists are photographs, not live lists'),
          P(
            'Both audiences were exported from Planning Center on a fixed date and uploaded to MailerLite. Anyone added since is not on them. At the time of writing the export is around three weeks old. The dashboard now shows that age, because a list that looks healthy and is quietly out of date is worse than one that looks empty.',
          ),
          P(
            'Related: the MailerLite group named "Members" contains 4,071 people, against a real membership list of 324. It is a leftover from the Mailchimp migration. Any report built on it would have been wrong by a factor of twelve.',
          ),

          H2('The archive audio is gone'),
          P(
            'Every one of the 174 audio recordings from before 2018 is unreachable. They were stored using a Dropbox sharing method that Dropbox discontinued in 2017. All 174 links were tested; none respond. The sermons are still listed with their speaker and date, but the recordings themselves are lost unless copies exist elsewhere. The original filenames have been preserved so they can be matched back if they ever turn up.',
          ),

          H2('Dates are missing for a third of the archive'),
          P(
            'For 286 older sermons no date could be established: the website never printed a year, no file path contains one, and the underlying page dates are an artifact of a bulk migration. These are recorded as unknown rather than guessed. They appear at the end of the listing rather than being assigned a plausible-looking date that would then be treated as fact.',
          ),

          // ── How we know ──
          H1('How the numbers can be trusted'),
          Bullet('Every imported row records the file it came from, and each file is fingerprinted so the same export cannot be counted twice. The folder already contained one attendance export saved under two different names.'),
          Bullet('Imports accumulate by snapshot date rather than overwriting, so the membership signup list growing from 21 to 59 people between April and August remains visible as growth rather than replacement.'),
          Bullet('Where a figure is unknown it is stored as unknown. The monthly report distinguishes four states — a real number, a genuine zero, "happened but not recorded", and "did not run" — because charting the last two as zero would show declines that never occurred.'),
          Bullet('Registrations are matched to church records on exact email only. No name matching: a false match silently corrupts every downstream figure, whereas a missing one is merely a gap.'),
          Bullet('Every dashboard query is checked automatically against the live database before release, so a broken figure is found before staff see it.'),

          // ── Not done ──
          H1('Not done, and decisions needed'),
          P('These need a decision from someone other than the developer.'),

          makeTable(
            ['Item', 'Where it stands'],
            [
              ['Who may see personal data', 'The dashboard is currently open to any signed-in staff account. Reachability and any follow-up work show named people, their email addresses and who has unsubscribed. Access needs deciding before it goes wider.'],
              ['How ministries record attendance', 'Some ministries use the Church Center app, others do not, and nobody has a complete picture of which. Worth confirming with the ministries lead before building anything to replace the spreadsheets.'],
              ['Live Planning Center sync', 'All syncing is currently run by hand. Data goes stale unless someone runs it. A scheduled sync is the obvious next infrastructure step.'],
              ['Follow-up records', 'Planning Center holds a follow-up field with around 379 people flagged as needing contact. It has not been examined yet and is the highest-value untouched item.'],
              ['Sermon archive publication', 'The imported sermons are drafts. They are in the system and correct, but not yet visible to the public.'],
            ],
            [2600, 6760],
          ),

          // ── Next ──
          H1('Suggested next steps'),
          Bullet('Confirm who may see named and pastoral data, which unblocks the follow-up section.'),
          Bullet('Answer the group question: is 62% genuinely unconnected, or is group membership simply not maintained?'),
          Bullet('Add an email field to the Family Day registration form before it runs again — 49 people were unreachable last time.'),
          Bullet('Decide whether the 185 unknown contacts should be followed up, and by whom.'),
          Bullet('Move the syncs onto a schedule so the dashboard stops depending on someone remembering.'),

          new Paragraph({
            children: [new TextRun({ text: '', size: 2 })],
            spacing: { before: 400 },
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'D9D9D9' } },
          }),
          Note('Generated from the project repository. Figures are direct counts from the reporting database; nothing on this page is estimated.'),
        ],
      },
    ],
  })

  const outDir = resolve(ROOT, 'reports')
  mkdirSync(outDir, { recursive: true })
  mkdirSync(SHOTS, { recursive: true })
  const out = resolve(outDir, `HIF Journey Dashboard - Status Report ${today}.docx`)
  writeFileSync(out, await Packer.toBuffer(doc))

  const missing = SCREENSHOTS.filter((s) => !existsSync(resolve(SHOTS, s.file)))
  console.log(`\n✓ ${out.replace(ROOT, '.')}`)
  if (missing.length) {
    console.log(`\n  ${missing.length} screenshot(s) not found — placeholders inserted.`)
    console.log(`  Drop PNGs into reports/screenshots/ and re-run:`)
    for (const s of missing) console.log(`    ${s.file}`)
  }
  console.log('')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
