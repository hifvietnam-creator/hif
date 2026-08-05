# "Turn it to Praise" — website vs Payload

Source: `https://www.hif.vn/turn-it-to-praise/` via `wp-json/wp/v2/posts?slug=turn-it-to-praise`
Verified against Payload: 2026-08-05 · **Read-only. Nothing was written.**

---

## Corrections to the first draft of this report

Two anomalies I reported before running the script were artefacts of my own
text search, not real. Both were disproved by the parser:

**"Way of Happiness has no video" — false.** It has `13m60nVgY2Q`. My manual
scan missed the 8th entry because its date is written with a non-breaking space
(`June 14,&nbsp;2026`). Ripgrep's `\s` is ASCII-only and doesn't match U+00A0,
so the entry's anchor — and with it the entry's video — dropped silently out of
the scan. JavaScript's `\s` does match U+00A0, so the script found all 8.

**"Psalm 22 and Where is Safety share a slides link" — false.** Psalm 22's
actual link is `IQC_XWVXZPonR5QueE9mMwzfAatLj_CrsdFn_1VQxic5K2Q?e=4nnJmj`. The
two only looked identical in the markdown-converted view of the page; the raw
API content has them distinct. The duplicate-detection check ran and correctly
stayed silent.

Lesson worth keeping: the rendered/markdown view of this site is not reliable
for extraction. Only the WP REST content is.

---

## Verified result

All 8 entries parsed cleanly, all 8 have videos, all 8 have distinct slide links.

| # | Date | Title | Speaker | Video | Slides | Discussion | In Payload |
|---|---|---|---|---|---|---|---|
| 1 | 2026-08-02 | Psalm 110 | JV | `Cfc5z7hNNek` | yes | — | **no** |
| 2 | 2026-07-26 | Psalm 90 | Pastor Kester Scandrett | `BL193poOFo0` | yes | — | **no** |
| 3 | 2026-07-19 | Psalm 89 | Pastor Kester Scandrett | `7DxZ47GChaA` | yes | — | **no** |
| 4 | 2026-07-12 | Psalm 72 | Pastor Peter DeFretes | `B4AZ7zWVyJc` | yes | — | **no** |
| 5 | 2026-07-05 | Psalm 23 | Micheal Walls | `kwsGdrNOyUI` | yes | — | **no** |
| 6 | 2026-06-28 | Psalm 22 | Pastor Roberts | `aDS3-dmAKKE` | yes | — | **no** |
| 7 | 2026-06-21 | Where is Safety | Pastor Kester | `Iu08pgSrIOs` | yes | yes | yes (id 2) |
| 8 | 2026-06-14 | Way of Happiness | Pastor Kester | `13m60nVgY2Q` | yes | — | yes (id 1) |

---

## What the comparison actually surfaced

### 1. Payload stopped ingesting sermons after 21 June

Six consecutive weeks — 28 June through 2 August — are on the website and
absent from the database. Payload holds 29 sermons and **zero** inside this
page's date window that the page doesn't list, so nothing was renamed or
mismatched. The records simply were never created.

The `sync-sermons` job only walks Series that have a `youtubePlaylistId`. Either
the Psalms series carries no playlist ID, or the videos aren't in the playlist
it points at, or the job hasn't run since June. Worth checking in that order —
it's cheap to rule out, and until it's fixed, backfilling PDF links is pointless
because there are no rows to attach them to.

### 2. Payload record id 1 disagrees with the website on both title and date

| | Payload | Website |
|---|---|---|
| Title | `Psalms1` | Way of Happiness |
| Date | 2026-06-16 | 2026-06-14 |
| Video | `13m60nVgY2Q` | `13m60nVgY2Q` |

Same video, so the match is certain. `Psalms1` looks like a placeholder someone
typed. The two-day date gap is structural, not a typo: the sync writes YouTube's
`publishedAt`, which is when the video was uploaded, not when the sermon was
preached. Every synced sermon will drift by however long upload takes.

The website carries the real preach date and the real title. That makes it the
better authority for both fields — which is a bigger conclusion than "the site
has some PDFs".

### 3. A half-finished manual edit

`Where is Safety` (id 2) has `discussionQuestions.type` set to `url` but `url`
left empty. Someone began entering it by hand and stopped. The website has the
link.

### 4. Devotional guides

Confirmed with you: these ran for a period and were discontinued. None of the 8
entries here has a live link, though all 8 still display the label as plain
text. Past sermon posts will have real ones.

There is currently **no field** on the Sermons collection to hold them. Nothing
can be imported until one exists.

---

## Field mapping

| Website | Payload | Status |
|---|---|---|
| Slides PDF link | `sermonPdfUrl` | exists, empty on both matched records |
| Discussion group guide | `discussionQuestions.url` + `type: 'url'` | exists |
| 5-Day devotional guide | — | **no field** |
| Preach date | `date` | exists, currently from YouTube upload time |
| Sermon title | `title` | exists, currently from YouTube title |

---

## Running it

```bash
pnpm compare:sermons                      # this page vs Payload
pnpm compare:sermons --no-db              # scrape only
pnpm compare:sermons --slug=ephesians     # another series post
```

Writes `reports/sermon-reconciliation-<date>.{md,json}`. Reads from Payload,
never writes to it.
