# Sermon archive — build status & handoff

Last updated: 2026-08-13
Read this before touching anything under `/sermons`, `src/collections/Sermons`,
or `scripts/*sermon*`.

---

## What happened

The Sermons collection held **29 records**, synced from YouTube playlists. The
website at hif.vn held **810 sermons** going back to 2015, along with the only
copies of the slide PDFs, discussion guides and MP3 links. Neither side was a
complete record of anything.

The archive is now imported: **808 sermons in Payload**, reconciled against the
website with 0 missing.

| | Before | After |
|---|---:|---:|
| Sermons | 29 | 808 |
| With slides link | 0 | 483 |
| Team members | 7 | 66 |
| Series | 5 | 73 |

---

## The pipeline

Run in this order. Each step reads the previous step's output; none of them
write to Payload except where noted.

```bash
pnpm compare:sermons:all      # scrape + reconcile   → reports/sermon-reconciliation-full-*.json
pnpm analyze:speakers         # cluster speakers     → config/sermon-speaker-map.json
pnpm analyze:series           # map posts to series  → config/sermon-series-map.json
pnpm import:sermons           # dry run
pnpm import:sermons --apply   # WRITES
```

Supporting:

```bash
pnpm apply:sermon-links       # backfill PDF/discussion links onto existing sermons (WRITES with --apply)
pnpm audit:audio              # check MP3 links resolve (WRITES the flag with --apply)
pnpm backfill:sortdate        # WRITES
pnpm backfill:series-year     # WRITES with --apply
pnpm diagnose:publish         # why a draft will not publish
```

### Generated vs hand-maintained

**Never edit** `config/sermon-speaker-map.json` or `config/sermon-series-map.json`
— they are overwritten on every analyze run.

**Edit these instead**, they survive re-runs:
- `config/sermon-speaker-overrides.json` — merges, `defaultRole`, co-speakers
- `config/sermon-series-overrides.json` — post→series mapping, series titles

---

## Things that will bite you

**The website's rendered HTML is not usable for extraction.** YouTube links live
inside a page-builder shortcode and only become iframes after JS runs. Use
`hif.vn/wp-json/wp/v2/posts?slug=…`. Two "anomalies" in the first report were
artefacts of reading the rendered page.

**That WP endpoint sits behind a cache that ignores query strings.** It will
happily return a different post than the one you asked for. `fetchPost()`
verifies the returned slug matches and falls back to scraping the permalink.
Enumeration goes through the category archive, whose paths are cache-safe.

**Postgres orders NULLs FIRST on a descending sort.** This bit twice:
- Sermons: `date` is nullable, so `sort: '-date'` put every undated archive
  sermon above this month's. Hence the hidden `sortDate` field — a sort key,
  not a real date, with a 1900 sentinel. Never edit it; a `beforeChange` hook
  keeps it in sync. New sermons created outside the import need
  `pnpm backfill:sortdate`.
- Series: same problem via `-year`. Now sorted in JS in `FilterSidebar`.

**Payload skips validation on drafts.** The import creates drafts, so a field
problem only surfaces when someone hits Publish. `pnpm diagnose:publish` prints
the field-level errors the admin UI summarises away.

**Dev `push` writes to whatever `DATABASE_URL` points at.** If that is
production, running `pnpm dev` alters the production schema. There is no
`src/migrations` directory; `audio_url`, `sort_date` and `audio_unavailable`
were all added this way.

---

## Decisions and why

**`date` is optional.** 286 sermons have no recoverable date: no year printed on
the page, none in any file path, and a bulk-migration WordPress publish date
(2019-08-16 / 2019-08-20, shared by 28 posts) that carries no information. Empty
means unknown. Inventing a date would have said something false, and the
analyzers refuse to guess where evidence runs out.

Dates come from three sources, recorded per sermon as `dateSource`:
`explicit` (printed), `audio-path` (the `/2015/` folder in an MP3 URL — hard
evidence), and `inferred` (publish date plus month sequence — the only one that
is a guess). If an inferred series ends up spanning >400 days the inference has
demonstrably failed, and those dates are withdrawn rather than published.

**All 174 archive MP3 links are dead.** They use Dropbox's Public-folder scheme,
switched off in March 2017. Audited: 123×404, 28×403, the rest error pages, 0
reachable. 185 sermons carry `audioUnavailable: true` and render as having no
media rather than showing a player that silently fails.

The URL is deliberately **kept, not cleared** — these sermons have no video, so
`audioURL` is their only unique key. Clearing it would make the importer
unable to recognise them and it would duplicate all 185 on the next run.

Original filenames are preserved in `reports/audio-audit-*.json`
(`Pastor John Johnson - Character Counts - HIF MYDINH (Sept 6).mp3`). If the
MP3s turn up anywhere, that is the key to match them back.

**Speakers are matched on edit distance, never on given name alone.** Given-name
matching cannot distinguish a typo from a different person — it linked 177 of
Jason Fizzard's sermons to Jason Morris. Spelling variants merge only with a
shared given or family name plus a small edit distance. Nicknames (Mike/Michael)
are too far apart for that and are listed for a human instead.

**Two campuses, two sermons per Sunday.** MyDinh and Westlake ran separate
services pre-2019. Same date, different speaker, both kept as separate records.
There is no campus field; the campus appears in derived titles.

---

## Outstanding

| | |
|---|---|
| **779 sermons are drafts** | Not visible on the site. Blocked on the publish validation error — run `pnpm diagnose:publish --all`. |
| 5 keyless sermons | No video and no audio, so no stable key. Skipped by default; `--include-keyless` on a run you will not repeat. |
| `Christmas 2025` | Recorded as year 2026 though its first sermon is Nov 2025. Pre-dates this work; `--overwrite` would fix it. |
| Audio recovery | 185 sermons have a dead link and a known filename. Unresolved. |
| `sync-sermons` cron | Still writes `date` from YouTube's `publishedAt` (upload time), which drifts from the preach date. The website has the true date. |
| Migrations | No `src/migrations`. Schema and migration history have diverged. |

---

## Reports

Everything is in `reports/`, newest wins:

- `sermon-reconciliation-full-*.md` — website vs Payload, the master view
- `speaker-mapping-*.md` / `series-mapping-*.md` — clustering decisions
- `audio-audit-*.md` — dead link detail plus original filenames
- `sermon-import-*.json` — audit of what was created
- `link-backfill-*.json` — audit of field backfills
