# wl_songs_scraper

Downloads the song files for each Sunday plan from Planning Center Services and
files them into the worship leader's folder in the archive.

```
<archive>\<Leader>\<YYYY>\<MONTH>\<Month DD>\
...\Worship Leaders Line-up\Lovella\2026\SEPTEMBER\September 06\
```

## Quick start

```bash
# from the project root — see what the next Sunday would produce, download nothing
npx tsx --tsconfig tsconfig.scripts.json wl_songs_scraper/download.ts --dry-run

# do it for real
npx tsx --tsconfig tsconfig.scripts.json wl_songs_scraper/download.ts
```

Before the first real run, do a `--test-open` probe (below) to confirm the
download route, and settle any leaders reported as skipped in `mapping.json`.

---

## Rules

| | |
|---|---|
| Folder shape | `Leader\YYYY\MONTH\Month DD` — uppercase month, title-case date |
| Which files | **All** attachments on every song: every key, lyrics sheets included |
| Leader with no folder | Skipped and reported. A leader folder is **never** created. |
| Two leaders on a plan | Both get the same files |
| Service type | `Turn into Praise!` only (957307). WORSHIP NIGHT is excluded — change `SERVICE_TYPE_IDS` in `config.ts` if it should be included. |
| Existing archive | Never renamed, moved or deleted |
| Re-running | Files already present are left alone; safe and cheap to repeat |
| Interrupted run | Writes to `.part`, renames only when complete — no truncated PDFs |
| Links (YouTube etc.) | Counted and skipped — they have no bytes of their own |

---

## What the first probe run corrected

Three assumptions that looked obvious and were wrong. All three are now encoded
in `lib/plans.ts` rather than left as comments:

1. **`/services/v2/team_positions` returns nothing matching "Worship Leader".**
   The position name only appears as `team_position_name` on a plan's team
   members. Leaders are therefore found per plan.

2. **Plan items do not carry `item_type === 'song'`.** A plan with 31 items
   reported zero songs. A song is identified by the item having a `song`
   relationship — never by `item_type`.

3. **`plan_times.starts_at` is UTC.** The `01:30 03:00 04:30` in the first probe
   output is the 08:30 / 10:00 / 11:30 service in local time. This confirmed one
   plan covers all three services.

## Commands

### Probe — read-only reconnaissance

```bash
npx tsx --tsconfig tsconfig.scripts.json wl_songs_scraper/probe.ts
```

| Flag | |
|---|---|
| `--months 24` | how far back to sample plans |
| `--plans 6` | how many plans to inspect song by song |
| `--all-types` | probe every service type, not just the configured one |
| `--test-open` | make **one** attachment `open` POST to confirm downloading works |

Writes `probe-report.json`.

### Download

```bash
npx tsx --tsconfig tsconfig.scripts.json wl_songs_scraper/download.ts [selection] [options]
```

Selecting plans:

| Flag | |
|---|---|
| *(default)* | the next plan on or after today |
| `--date 2026-09-13` | one specific plan date |
| `--since 2026-01-01 --until 2026-06-30` | a range, for backfilling |
| `--last 4` | the most recent 4 plans up to today |

Options: `--dry-run`, `--force` (re-download existing), `--service-type ID`.

---

## The one POST — and the trap next to it

`src/lib/pco.ts` is deliberately incapable of writing, and says so. Downloading
an attachment needs one non-GET request: the attachment `open` action, which
mints a short-lived signed S3 URL and logs an `AttachmentActivity`. That client
was left untouched; the exception lives in `lib/attachments.ts` as one function
with a long comment, so the read-only guarantee still holds.

**The POST is unavoidable.** A real attachment record looks like this:

```
url          "https://services.planningcenteronline.com/attachments/103043115"
linked_url   "https://services.planningcenteronline.com/songs/18597977/a"
remote_link  "42144aaed5c70230ae456e6e95c8ecd0"
```

`url` and `linked_url` are Services **web pages**, not files — fetching either
returns HTML, which would have been written to disk as a `.pdf`. `remote_link`
is an S3 object key despite the name, and belongs to a perfectly ordinary
stored PDF. So `directUrl()` deliberately ignores all three, and
`isDownloadableFile()` judges by `downloadable` plus the presence of a filename
rather than by `remote_link`.

### Verifying a signed URL

Use a **one-byte ranged GET**, never HEAD. S3 presigns for a specific HTTP
method, so a HEAD against a GET-signed URL returns `403 SignatureDoesNotMatch`
even when the URL is perfectly good. The first `--test-open` run did exactly
that and reported a 403 — then printed "confirmed end to end" anyway, because
the success message was unconditional. Both are fixed: `verifyUrl()` does the
ranged GET, and the message now depends on the result.

## Filenames

Two things the first dry run exposed, both fixed in `lib/attachments.ts` and
`lib/paths.ts`:

**Generated chord sheets arrive as `viewchordsheet` with no extension** — a
file Windows cannot open. The extension is inferred from the record, in this
order:

1. `content_type` — a real MIME type, so it cannot be vague
2. `filetype` — usually right (`"pdf"`), occasionally worthless
3. the HTTP response's own `Content-Type`, read at download time

Step 2 is filtered through a blocklist, because these chord sheets report
`filetype: "file"` — which the first attempt happily turned into
`You Are Good - viewchordsheet.file`. Windows creates that name without
complaint and nothing opens it.

Step 3 exists because a name whose extension is unknown until the bytes arrive
is still worth getting right. The "already downloaded?" check treats any
`<base>.<ext>` as a match for an extension-less name, so those files are not
re-fetched every run.

**And they are all named the same.** A six-song plan produced two files called
`viewchordsheet` — the second would have silently overwritten the first,
leaving a song's chord sheet missing with nothing on disk to show it had ever
existed. `resolveCollisions()` sees the whole plan at once and disambiguates by
song:

```
viewchordsheet.pdf  ×3   →   You Are Good - viewchordsheet.pdf
                             God I Look To You - viewchordsheet.pdf
                             Build My Life - viewchordsheet.pdf
```

Real filenames — `Lord You Are Good - Israel Houghton F.pdf` — are never
touched. A numeric suffix is the fallback if two files share both a song title
and a name.

## The `viewchordsheet` trap

Worth reading before trusting any attachment field.

PCO's "view chord sheet" entries look exactly like stored files:
`downloadable: true`, a display name, nothing marking them as a link, and the
`open` action returns a valid signed URL. Following that URL serves a **149 KB
HTML page** — the chord sheet as rendered in the Services UI.

An early version trusted all of that and wrote two web pages into Lovella's
September 06 folder named as if they were charts. In a directory listing they
look plausible. They open as nothing.

Two defences, because one was clearly not enough:

1. **`isDownloadableFile()` now requires positive evidence** that bytes exist —
   `pco_type` of `AttachmentS3`, a positive `file_size`, or a `content_type`
   that maps to a real extension. Absence of evidence that something is a link
   is not evidence that it is a file.
2. **The download refuses `text/html`.** No chord chart is ever a web page, so
   if a signed URL serves one, the file is skipped and reported rather than
   written.

## What each attachment kind actually is

Settled by evidence, not inference — `--test-open` opens one of every kind and
follows the URL:

| `pco_type` | filetype | what the signed URL serves | downloaded |
|---|---|---|---|
| `AttachmentS3` | pdf | a real file, `application/pdf` | **yes** |
| `AttachmentYoutube` | video | a web page | no |
| `AttachmentLink` | file | a web page (148 KB of HTML) | no |
| `AttachmentChart::Lyric` | lyric | *nothing — `open` returns no URL* | no |

`AttachmentS3` is the only kind with bytes behind it. The other three are
correctly skipped, and nothing is being lost:

- **`AttachmentLink`** is the `viewchordsheet` trap below.
- **`AttachmentYoutube`** is a link by definition — 15 of them across 8 plans,
  and the raw material for the playlist idea.
- **`AttachmentChart::Lyric`** is PCO's generated lyric chart. The `open`
  action declines to mint a URL for it at all, so there is nothing to fetch
  through this route. If those lyric sheets are wanted, they need a different
  mechanism — not a tweak to this one.

`--test-open` cross-checks each kind's verdict against what its URL really
serves, and complains in **both** directions: downloaded-but-serves-HTML, and
skipped-but-serves-a-real-file. Testing one attachment only ever proved one kind
worked, which is exactly how `viewchordsheet` slipped through.

Probe section 7 groups every attachment by `pco_type` / `filetype` /
`content_type` and says whether each kind would be downloaded — so the next
surprise of this shape shows up in a table instead of in the archive.

## Leader mapping

Nothing derives a folder name from a PCO name: PCO says
`Lovella Blanila- Dacles`, the folder says `Lovella`; PCO says `Ngoc Pearl Ngo`,
the folder says `Pearl`. So the matcher proposes and `mapping.json` decides.

Confidence levels, and what the downloader does with them:

| | | acts on it? |
|---|---|---|
| `override` | you named it in `mapping.json` | yes |
| `exact` | names are identical | yes |
| `prefix` | folder is the leading part of the PCO name — `Lovella` ⊂ `Lovella Blanila Dacles` | yes |
| `token` | shares a word — `Pearl` ∈ `Ngoc Pearl Ngo` | **no** — confirm it first |
| `none` | no match, or several equally good ones | no |

`token` is excluded on purpose: a shared first name is exactly how two different
Sarahs would end up sharing a folder. Confirm it once in `mapping.json` and it
becomes an `override`.

Where the strict matcher gives up, the probe now prints *suggestions* built
from edit distance and prefix containment — hints to confirm, never used to
file anything:

| PCO name | strict | suggested |
|---|---|---|
| `Juliette Ellazo` | — | `Juliete` (folder is misspelled) |
| `Michael Walls` | `Michael W` (token) | `Michael W` |
| `Ngoc Pearl Ngo` | `Pearl` (token) | `Pearl` |
| `Oluwatomisin Ogunbawo` | — | `Tomi` |
| `Nadille Ngwemetah` | — | *nothing similar* |
| `Mary Ann Japon` | `Judy Ann` (token) | ⚠ **wrong** |

That last row is why `token` is not trusted. `Mary Ann Japon` and `Judy Ann`
share the word "Ann" and nothing else — auto-filing it would have put Mary
Ann's charts in Judy Ann's folder every time she led, and nobody would have
noticed until a Sunday morning.

**All six need confirming in `mapping.json` before those leaders are filed.**

## Files

| | |
|---|---|
| `config.ts` | Archive root, service types, position name. Change things here. |
| `mapping.json` | PCO name → folder overrides. Yours to edit. |
| `probe.ts` | Read-only reconnaissance → `probe-report.json` |
| `download.ts` | The downloader |
| `lib/plans.ts` | Reading plans, leaders and song attachments |
| `lib/leaders.ts` | Name → folder matching |
| `lib/paths.ts` | The one folder convention, and Windows-safe names |
| `lib/attachments.ts` | Resolving an attachment to bytes — the one POST |

## The weekly schedule

Three Windows scheduled tasks, all running the same command:

| | when | |
|---|---|---|
| `WL Songs - Friday` | Fri 15:00 | first attempt |
| `WL Songs - Saturday AM` | Sat 10:00 | retry, only if Friday left songs missing |
| `WL Songs - Saturday PM` | Sat 14:00 | last retry |

Install once, from an **elevated** PowerShell in the project root:

```powershell
powershell -ExecutionPolicy Bypass -File .\wl_songs_scraper\install-schedule.ps1
```

Remove them with `-Uninstall`. Logs append to `wl_songs_scraper\logs\YYYY-MM.log`.

### Why the scheduler is dumb and the script is smart

The Saturday tasks always fire. The *script* decides whether there is anything
to do:

```
download.ts --sunday --skip-if-complete
```

`--sunday` picks the plan for the coming Sunday specifically — not "the next
plan", which on a week with a midweek plan would grab the wrong one.
`--skip-if-complete` reads `.state/<date>.json` and exits immediately, before
any API call, if a previous run already found every song's files.

Putting the decision in the script rather than in the schedule means you can
check it by running the command yourself, and there is no scheduler state to
drift out of step with what is actually on disk.

### What "complete" means, and what it cannot mean

A plan is complete when **every song has at least one downloadable file**.

There is something this genuinely cannot distinguish: a chart nobody has
uploaded *yet* looks exactly like a song that will never have one. PCO exposes
no difference. Judy Ann's 13 September plan is a real example — `I Stand In
Awe` and `Creator` have no files at all, so that plan reports incomplete and
every scheduled run re-checks it.

That is deliberate rather than a flaw. Re-checking is nearly free because
existing files are skipped, and the run names the songs still missing — so
whoever reads the log can see whether it is a chart that never arrived or a
song that simply has none.

### Exit codes

| | |
|---|---|
| `0` | done, or nothing to do |
| `3` | incomplete — some songs still have no files, retry later |
| `1` | error — something actually failed |

`3` is not a failure. Everything that existed was downloaded correctly.

### Why not a Claude scheduled task

It would not work. This machine's network policy blocks
`api.planningcenteronline.com` from Anthropic's sandbox, so a cloud-side run
cannot reach PCO at all. Windows Task Scheduler runs where the network and the
files are, and does not depend on a chat session being open.

## Still open

- **Six leaders need mapping** before they are filed — see the table above.
- **Future plans are often empty.** As of 2026-09-08, every Sunday from the
  13th onwards has a leader scheduled but no songs chosen. The downloader
  reports these as "plan has no songs yet (not built)" rather than treating it
  as an error — but a weekly scheduled run has to tolerate it and re-run later.
- **YouTube links on songs** are counted and skipped, not downloaded — they are
  links, not files. Lovella's 6-song plan had 7 of them. Capturing those for the
  playlist idea is the next step.
- **Songs with no files at all** are reported per plan (`Hear Our Praise Rising`
  on 2026-09-06 has none) so a gap in PCO is visible rather than silent.
- **Normalising the back catalogue** (four different folder conventions, a
  February service filed under JANUARY, a `5 Julyy 2022`) is a separate job and
  deliberately not attempted here.
