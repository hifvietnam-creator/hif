# Website vs Payload — full sermon reconciliation

Generated 2026-08-05T10:10:04.177Z

**Read-only. Nothing in this run wrote to Payload.**

## Summary

| | Count | % |
|---|---:|---:|
| Sermons found on the website | 809 | 100 |
| Matched to a Payload record | 26 | 3 |
| On the website, absent from Payload | 778 | 96 |
| Unmatchable (no video, no audio) | 5 | 1 |
| Payload sermons not found on the website | 2 | — |
| Payload sermons total | 29 | — |
| Carrying a slides link | 482 | 60 |
| Carrying a discussion guide | 9 | 1 |
| Carrying an MP3 | 185 | 23 |

### Where each date came from

| Source | Count | % |
|---|---:|---:|
| explicit | 26 | 3 |
| audio-path | 124 | 15 |
| inferred | 373 | 46 |
| unknown | 286 | 35 |

`explicit` = printed on the page. `audio-path` = read from the year folder
in the MP3 URL. `inferred` = derived from publish date and month sequence,
and is the only category that should be treated as a guess.

### Series with no recoverable year

No year on the page, none in any file path, and a bulk-migration publish
date that carries no information. These are left dated `null` rather than
guessed. Someone who remembers the era could date them by hand.

- **ENDS OF EARTH** (https://www.hif.vn/ends-of-earth/) — 30 sermons
- **PROVERBS – THE WAY OF WISDOM** (https://www.hif.vn/proverbs-the-way-of-wisdom/) — 14 sermons
- **PHILLIPIANS** (https://www.hif.vn/phillipians/) — 16 sermons
- **KINGDOM LIFE** (https://www.hif.vn/kingdom-life/) — 12 sermons
- **INDEPENDENT SERMON** (https://www.hif.vn/independent-sermon/) — 14 sermons
- **LIVING ON PURPOSE** (https://www.hif.vn/living-on-purpose/) — 8 sermons
- **EXODUS** (https://www.hif.vn/exodus/) — 31 sermons
- **CHRISTMAS HOPE** (https://www.hif.vn/christmas-hope/) — 8 sermons
- **THE JESUS I NEVER KNEW** (https://www.hif.vn/the-jesus-i-never-knew/) — 14 sermons
- **HEART TO HEART** (https://www.hif.vn/heart-to-heart/) — 22 sermons
- **KINGDOM COME** (https://www.hif.vn/kingdom-come/) — 10 sermons
- **WHAT CHILD IS THIS** (https://www.hif.vn/what-child-is-this/) — 8 sermons
- **BEYOND IMAGINATION** (https://www.hif.vn/beyond-imagination/) — 27 sermons
- **WALK THE TALK** (https://www.hif.vn/walk-the-talk/) — 10 sermons
- **LIGHT TO THE NATIONS** (https://www.hif.vn/light-to-the-nations/) — 6 sermons
- **JONAH** (https://www.hif.vn/jonah/) — 4 sermons
- **CHOSEN** (https://www.hif.vn/chosen/) — 17 sermons
- **CONVERSATION** (https://www.hif.vn/conversation/) — 13 sermons
- **ON YOUR MARK** (https://www.hif.vn/on-your-mark/) — 13 sermons
- **LIGHTS OF HOME** (https://www.hif.vn/lights-of-home/) — 9 sermons

### Series whose year inference was withdrawn

Inferred dates spanned more than 400 days, which no real series does — proof
the inference failed. Guessed years were dropped; any explicit or file-path
years were kept. Matching is unaffected, since the join key is the video.

- **ENDS OF EARTH** (https://www.hif.vn/ends-of-earth/) — all dates withdrawn, 30 sermons

## By era

| Era | Sermons | Matched | Missing | Slides | Discussion | MP3 | Inferred dates |
|---|---:|---:|---:|---:|---:|---:|---:|
| A | 38 | 15 | 23 | 21 | 6 | 0 | 14 |
| B | 585 | 11 | 570 | 461 | 3 | 0 | 355 |
| C | 17 | 0 | 17 | 0 | 0 | 17 | 0 |
| D | 169 | 0 | 168 | 0 | 0 | 168 | 4 |

## By series

| Series | Era | Sermons | Dates | Matched | Slides | Discussion | MP3 | Flags |
|---|---|---:|---|---:|---:|---:|---:|---:|
| [Turn it to praise](https://www.hif.vn/turn-it-to-praise/) | A | 8 | 2026-06-14 → 2026-08-02 | 2 | 8 | 1 | 0 | 8 |
| [Pass It On](https://www.hif.vn/pass-it-on/) | A | 7 | 2026-04-26 → 2026-06-07 | 7 | 6 | 5 | 0 | 8 |
| [The King has Come](https://www.hif.vn/the-king-has-come/) | A | 6 | 2026-03-01 → 2026-04-05 | 6 | 6 | 0 | 0 | 7 |
| [New Sermon Series : Heaven’s Favor](https://www.hif.vn/heavens-favor/) | B | 7 | 2026-01-11 → 2026-02-22 | 7 | 7 | 0 | 0 | 7 |
| [Christmas 2025](https://www.hif.vn/christmas-2025/) | B | 5 | 2025-11-30 → 2026-01-04 | 4 | 5 | 0 | 0 | 5 |
| [Ephesians](https://www.hif.vn/ephesians/) | B | 12 | 2025-09-07 → 2025-11-23 | 0 | 12 | 0 | 0 | 12 |
| [Breakthrough Prayer](https://www.hif.vn/breakthrough-prayer/) | B | 5 | 2025-08-03 → 2025-08-31 | 0 | 5 | 0 | 0 | 5 |
| [JONAH](https://www.hif.vn/jonah-2/) | B | 6 | 2025-06-22 → 2025-07-27 | 0 | 6 | 0 | 0 | 6 |
| [BEYOND](https://www.hif.vn/beyond/) | B | 7 | 2025-05-04 → 2025-06-15 | 0 | 4 | 0 | 0 | 6 |
| [REMARKABLE](https://www.hif.vn/remarkable/) | A | 17 | 2025-01-05 → 2025-04-27 | 0 | 1 | 0 | 0 | 16 |
| [CHRISTMAS GOOD NEWS OF GREAT JOY](https://www.hif.vn/christmas-good-news-of-great-joy/) | B | 5 | 2024-12-01 → 2024-12-29 | 0 | 0 | 0 | 0 | 5 |
| [GOOD NEWS](https://www.hif.vn/good-news/) | B | 4 | 2024-11-03 → 2024-11-24 | 0 | 0 | 0 | 0 | 4 |
| [PRAYER REVOLUTION](https://www.hif.vn/prayer-revolution/) | B | 9 | 2024-09-01 → 2024-10-27 | 0 | 0 | 0 | 0 | 9 |
| [CHARACTER COUNTS](https://www.hif.vn/character-counts-2/) | B | 9 | 2024-06-30 → 2024-08-25 | 0 | 1 | 0 | 0 | 9 |
| [SERVANT LEADERSHIP](https://www.hif.vn/servant-leadership/) | B | 4 | 2024-06-02 → 2024-06-23 | 0 | 0 | 0 | 0 | 4 |
| [UNDEFEATED](https://www.hif.vn/undefeated/) | B | 16 | 2024-02-18 → 2024-05-26 | 0 | 0 | 0 | 0 | 16 |
| [WALK LIKE JESUS](https://www.hif.vn/walk-like-jesus/) | B | 4 | 2024-01-21 → 2024-02-11 | 0 | 0 | 0 | 0 | 4 |
| [GOD WITH US](https://www.hif.vn/god-with-us-2/) | B | 2 | 2024-01-07 → 2024-01-14 | 0 | 0 | 0 | 0 | 2 |
| [GOD WITH US](https://www.hif.vn/god-with-us/) | B | 6 | 2023-11-26 → 2023-12-31 | 0 | 0 | 0 | 0 | 5 |
| [Nehemiah Sermon Series](https://www.hif.vn/nehemiah-sermon-series/) | B | 6 | 2023-10-15 → 2023-11-19 | 0 | 0 | 0 | 0 | 6 |
| [Mission & Vision](https://www.hif.vn/mission-vision/) | B | 10 | 2023-08-06 → 2023-10-08 | 0 | 0 | 0 | 0 | 9 |
| [KINGDOM VISION](https://www.hif.vn/kingdom-vision/) | B | 5 | 2023-07-02 → 2023-07-30 | 0 | 0 | 0 | 0 | 5 |
| [FAITH IN ACTION](https://www.hif.vn/faith-in-action/) | B | 11 | 2023-04-16 → 2023-06-25 | 0 | 0 | 0 | 0 | 11 |
| [The Blessed Life](https://www.hif.vn/the-blessed-life/) | B | 14 | 2023-01-08 → 2023-04-09 | 0 | 0 | 0 | 0 | 14 |
| [Christmas Around the World](https://www.hif.vn/christmas-around-the-world/) | B | 5 | 2022-11-27 → 2022-12-24 | 0 | 0 | 0 | 0 | 5 |
| [Parables of Jesus](https://www.hif.vn/parables-of-jesus/) | B | 9 | 2022-06-19 → 2022-08-14 | 0 | 8 | 0 | 0 | 7 |
| [ENDS OF EARTH](https://www.hif.vn/ends-of-earth/) | B | 30 | — | 0 | 28 | 0 | 0 | 47 |
| [SERVANT KING](https://www.hif.vn/servant-king/) | B | 15 | 2022-01-09 → 2022-04-17 | 0 | 15 | 0 | 0 | 16 |
| [THE WEARY WORLD REJOICES](https://www.hif.vn/the-weary-world-rejoices/) | B | 4 | 2021-11-28 → 2021-12-19 | 0 | 4 | 2 | 0 | 4 |
| [HOPE UNDER PRESSURE](https://www.hif.vn/hope-under-pressure/) | B | 10 | 2021-09-05 → 2021-11-14 | 0 | 10 | 0 | 0 | 14 |
| [SUMMER IN THE PSALMS](https://www.hif.vn/summer-in-the-psalms/) | B | 11 | 2021-06-20 → 2021-08-22 | 0 | 11 | 0 | 0 | 13 |
| [Deuteronomy](https://www.hif.vn/deuteronomy/) | B | 7 | 2021-04-18 → 2021-06-06 | 0 | 7 | 0 | 0 | 7 |
| [REDEMPTION](https://www.hif.vn/redemption/) | B | 15 | 2021-02-21 → 2021-06-06 | 0 | 15 | 0 | 0 | 17 |
| [JAMES](https://www.hif.vn/james/) | B | 13 | 2021-01-10 → 2021-04-11 | 0 | 13 | 0 | 0 | 13 |
| [BOOKENDS](https://www.hif.vn/bookends/) | B | 5 | 2021-01-10 → 2021-02-07 | 0 | 5 | 0 | 0 | 5 |
| [SONGS OF ADVENT](https://www.hif.vn/songs-of-advent/) | B | 9 | 2020-11-29 → 2020-12-27 | 0 | 9 | 0 | 0 | 11 |
| [BOOK OF RUTH](https://www.hif.vn/book-of-ruth/) | B | 5 | 2020-10-25 → 2020-11-22 | 0 | 5 | 0 | 0 | 5 |
| [COME TO ME](https://www.hif.vn/come-to-me/) | B | 5 | 2020-10-25 → 2020-11-22 | 0 | 5 | 0 | 0 | 5 |
| [Race Reconciliation](https://www.hif.vn/race-reconciliation/) | B | 4 | 2020-08-16 → 2020-10-18 | 0 | 4 | 0 | 0 | 5 |
| [TOGETHER](https://www.hif.vn/together/) | B | 10 | 2020-08-16 → 2020-10-18 | 0 | 8 | 0 | 0 | 10 |
| [BY FAITH](https://www.hif.vn/by-faith/) | B | 12 | 2020-06-21 → 2020-08-09 | 0 | 12 | 0 | 0 | 10 |
| [THE GOSPEL OF JOHN](https://www.hif.vn/no-greater-love/) | B | 36 | 2020-01-12 → 2020-06-14 | 0 | 36 | 1 | 0 | 32 |
| [MESSIAH IN A MANGER](https://www.hif.vn/messiah-in-a-manger/) | B | 8 | 2019-12-01 → 2019-12-22 | 0 | 7 | 0 | 0 | 2 |
| [SUFFERING](https://www.hif.vn/suffering/) | B | 14 | 2019-10-06 → 2019-11-24 | 0 | 14 | 0 | 0 | 10 |
| [MULTIPLY](https://www.hif.vn/multiply/) | B | 11 | 2019-09-08 → 2019-10-13 | 0 | 11 | 0 | 0 | 1 |
| [PROVERBS – THE WAY OF WISDOM](https://www.hif.vn/proverbs-the-way-of-wisdom/) | B | 14 | — | 0 | 13 | 0 | 0 | 24 |
| [PHILLIPIANS](https://www.hif.vn/phillipians/) | B | 16 | — | 0 | 16 | 0 | 0 | 25 |
| [KINGDOM LIFE](https://www.hif.vn/kingdom-life/) | B | 12 | — | 0 | 12 | 0 | 0 | 15 |
| [INDEPENDENT SERMON](https://www.hif.vn/independent-sermon/) | B | 14 | — | 0 | 13 | 0 | 0 | 28 |
| [LIVING ON PURPOSE](https://www.hif.vn/living-on-purpose/) | B | 8 | — | 0 | 8 | 0 | 0 | 9 |
| [EXODUS](https://www.hif.vn/exodus/) | B | 31 | — | 0 | 30 | 0 | 0 | 51 |
| [CHRISTMAS HOPE](https://www.hif.vn/christmas-hope/) | B | 8 | — | 0 | 8 | 0 | 0 | 12 |
| [THE JESUS I NEVER KNEW](https://www.hif.vn/the-jesus-i-never-knew/) | B | 14 | — | 0 | 13 | 0 | 0 | 18 |
| [HEART TO HEART](https://www.hif.vn/heart-to-heart/) | B | 22 | — | 0 | 22 | 0 | 0 | 32 |
| [KINGDOM COME](https://www.hif.vn/kingdom-come/) | B | 10 | — | 0 | 10 | 0 | 0 | 13 |
| [WHAT CHILD IS THIS](https://www.hif.vn/what-child-is-this/) | B | 8 | — | 0 | 8 | 0 | 0 | 8 |
| [BEYOND IMAGINATION](https://www.hif.vn/beyond-imagination/) | B | 27 | — | 0 | 26 | 0 | 0 | 37 |
| [WALK THE TALK](https://www.hif.vn/walk-the-talk/) | B | 10 | — | 0 | 10 | 0 | 0 | 10 |
| [LIGHT TO THE NATIONS](https://www.hif.vn/light-to-the-nations/) | B | 6 | — | 0 | 5 | 0 | 0 | 7 |
| [JONAH](https://www.hif.vn/jonah/) | D | 4 | — | 0 | 0 | 0 | 4 | 4 |
| [CHOSEN](https://www.hif.vn/chosen/) | C | 17 | — | 0 | 0 | 0 | 17 | 17 |
| [CONVERSATION](https://www.hif.vn/conversation/) | D | 13 | — | 0 | 0 | 0 | 13 | 13 |
| [ON YOUR MARK](https://www.hif.vn/on-your-mark/) | D | 13 | — | 0 | 0 | 0 | 13 | 13 |
| [LIGHTS OF HOME](https://www.hif.vn/lights-of-home/) | D | 9 | — | 0 | 0 | 0 | 9 | 9 |
| [LOVE HANOI](https://www.hif.vn/love-hanoi/) | D | 10 | 2016-10-23 → 2016-11-20 | 0 | 0 | 0 | 10 | 0 |
| [FAITH AT WORK](https://www.hif.vn/faith-at-work/) | D | 18 | 2016-08-21 → 2016-10-16 | 0 | 0 | 0 | 18 | 1 |
| [STANDING-FIRM](https://www.hif.vn/standing-firm/) | D | 9 | 2016-07-03 → 2016-08-14 | 0 | 0 | 0 | 9 | 0 |
| [RE-IMAGINE](https://www.hif.vn/re-imagine/) | D | 18 | 2016-04-24 → 2016-06-26 | 0 | 0 | 0 | 18 | 1 |
| [UPSIDE DOWN MOVEMENT](https://www.hif.vn/upside-down-movement/) | D | 19 | 2015-06-14 → 2015-08-30 | 0 | 0 | 0 | 19 | 1 |
| [THE BLESSED LIFE SERMON SERIES](https://www.hif.vn/the-blessed-life-sermon-series/) | D | 13 | 2016-01-03 → 2016-02-14 | 0 | 0 | 0 | 13 | 0 |
| [NO DOUBT](https://www.hif.vn/no-doubt/) | D | 16 | 2016-02-21 → 2016-04-10 | 0 | 0 | 0 | 16 | 1 |
| [IS IT CHRISTMAS YET?](https://www.hif.vn/is-it-christmas-yet/) | D | 7 | 2015-11-29 → 2015-12-27 | 0 | 0 | 0 | 7 | 2 |
| [CHARACTER COUNTS](https://www.hif.vn/character-counts/) | D | 20 | 2015-09-06 → 2015-11-15 | 0 | 0 | 0 | 19 | 3 |

## Unmatchable sermons

No video and no audio, so there is no key to join on. These would have to be
created from the website rather than matched.

- ? — ENDS OF EARTH — SERMONS/SERVICES BETWEEN
- ? — ENDS OF EARTH — ?
- 2022-03-20 — SERVANT KING — Pastor Jacob Bloemberg
- ? — LIGHT TO THE NATIONS — Pastor Jacob Bloemberg
- 2015-11-15 — CHARACTER COUNTS — Pastor John Johnson

## Unclassified link labels

Links found on the pages that map to no field. Confirm each is genuinely out of scope.

| Label | Count |
|---|---:|
| bible-study: Here | 16 |
| other: DOWNLOAD CHRISTMAS RESOURCES | 1 |

## In Payload, not found on the website

- 2025-12-24 — Love Broke Thru Christmas Eve (`R8Hc210j8Eo`)
- 2026-04-19 — Pass It On : Don't Hold it Back (`H9lexHgXmPE`)

## Proposed field changes (NOT applied)

2 matched sermons would gain at least one field.

| Date | Series | Field | Currently | Would become |
|---|---|---|---|---|
| 2026-05-31 | Pass It On | `discussionQuestions.url` | _empty_ | https://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2IvYy9lZTY3MzUyMjFjNTIyZDVlL0lRQTNh |
| 2026-05-24 | Pass It On | `discussionQuestions.url` | _empty_ | https://onedrive.live.com/?redeem=aHR0cHM6Ly8xZHJ2Lm1zL2IvYy9lZTY3MzUyMjFjNTIyZDVlL0lRQTNh |

## Caveats

- 373 dates were inferred from the post's publish date and month sequence,
  not read off the page. Series crossing New Year are the likeliest to be wrong.
- Posts migrated in bulk (publish date 2019-08-16 / 2019-08-20) carry no reliable
  publish anchor, so inferred years there deserve spot-checking before any write.
- Two sermons on one date is expected: two campuses, two speakers. Both are kept.
