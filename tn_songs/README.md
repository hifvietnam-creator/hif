# tn_songs

The Thai Nguyen weekly job: Elga's four songs become videos in the SONGS
folder and one lyrics deck in the house style.

```
THAI NGUYEN FELLOWSHIP\2026\SONGS\September 13\            ← the mp4s
Thai Nguyen Worship Songs\2026\September 13\September 13.pptx   ← the deck
```

## The weekly run

Paste Elga's Zalo message into a text file — one song per line:

```
Holy Forever | https://www.youtube.com/watch?v=xxxxxxxxxxx
Goodness of God, https://youtu.be/yyyyyyyyyyy
The Blessing
```

Title and link separated by `|`, a comma or a tab. Blank lines and `#` ignored.

Then two commands:

```powershell
powershell -ExecutionPolicy Bypass -File .\tn_songs\Get-Songs.ps1 -Songs .\songs.txt
python .\tn_songs\week.py --songs .\songs.txt
```

Both default to the **coming Sunday**. Add `-Date 2026-09-13` / `--date 2026-09-13`
for a specific one, and `-WhatIf` / `--dry-run` to see what would happen first.

## One-off setup

```powershell
winget install yt-dlp.yt-dlp
winget install yt-dlp.FFmpeg          # merges video+audio; without it you get 720p
powershell -ExecutionPolicy Bypass -File .\tn_songs\Convert-Legacy.ps1
```

`Convert-Legacy.ps1` uses the PowerPoint already on this machine to save the
54 legacy `.ppt` files as `.pptx`. **25 distinct songs exist only in that
format** and are invisible to everything else until this runs. Originals are
never touched, and re-running is free.

Then rebuild the index so those songs become available:

```powershell
pip install python-pptx          # once
python .\tn_songs\index_library.py --out .\tn_songs\songs-index.json
```

The library path is already set inside `index_library.py` (`DEFAULT_LIBRARY`),
so there is nothing to type. Pass `--library` only if it moves.

## Where lyrics come from

**Never invented.** Two sources, in this order:

1. **A `.txt` you supplied** — named after the song, sitting beside your song
   list. Blank line between each slide.
2. **The library** — 150+ songs, most of them from the hymnal, matched by title.

Anything found in neither is **reported and left out**, and the deck is built
from the rest. Add the `.txt`, run again, and it fills in. A song is never
silently dropped and lyrics are never guessed.

Exit code `3` means "built, but some songs are missing" — not a failure.

### Matching is deliberately cautious

| | | used? |
|---|---|---|
| `exact` | same title once case and punctuation are ignored | yes |
| `strong` | ≥80% of the identifying words match | yes |
| `weak` | 45–80%, or two candidates score alike | **no** |
| `none` | nothing close | no |

`My God is Good` scores 0.67 against `My GOD is good oh` — plausibly the same
song, plausibly not. It is reported rather than used. The wrong lyrics on
screen on a Sunday morning is worse than a missing song you can see coming.

## The deck's design is inherited, not recreated

`template.pptx` is a copy of your `September 06.pptx`. The builder clones its
two slide types —

- **title card**: `TextBox 7` at 66pt, plus the `Accent Rule` beneath it
- **lyric page**: `Rectangle 2` at 40pt, centred, shrink-to-fit

— and replaces only the words, editing each run's `<a:t>` in place so every
bit of formatting survives.

That matters because the library is *not* visually consistent: `Holy Forever`
is Verdana 100pt, `Our God` is 66pt grey on the default Office theme,
`Thousand generations` is Gotham. A deck assembled by copying those slides
would be a patchwork. Extracting the words and re-rendering them gives one
coherent deck.

To change the look, restyle `template.pptx` in PowerPoint. Everything built
afterwards follows.

## Reading the old decks

`lib/lyrics.py` handles fifteen years of inconsistency:

- Section markers as `VERSE1`, `[Verse 1]`, `CHORUS`, `PRE-CHORUS`, `Verse1-1`
  — sometimes their own slide, sometimes glued to the front of a lyric line
  (`VERSE1A thousand generations…`). All stripped.
- Slide numbers and `LYRICS PRESENTATION` subtitles. Stripped.
- Line breaks stored as `<a:br/>` inside one paragraph — which is how nearly
  every deck separates lyric lines. Reading `paragraph.text` glues them into a
  wall of text, so the XML is walked directly.

**Mid-deck song splitting is not done by guesswork.** An early version split
`Our God` into seven songs, because its 66pt lyric slides look exactly like
title cards. Splitting now happens only on the template's `Accent Rule`
marker — real evidence — so combined decks built by this tool split cleanly
and old ones are read as a single song and flagged.

Two library files can't be read and say so:

| file | why |
|---|---|
| `To be the Glory.pptx` | lyrics are images, no text at all |
| `16 February song set.pptx` | a combined set with no template markers — split by hand |

## Files

| | |
|---|---|
| `week.py` | the weekly command: match, build, report |
| `Get-Songs.ps1` | yt-dlp → mp4 into the SONGS folder |
| `Convert-Legacy.ps1` | one-off `.ppt` → `.pptx` via PowerPoint |
| `index_library.py` | rebuild `songs-index.json` from the library |
| `build_deck.py` | clones the template and fills in the words |
| `lib/lyrics.py` | reads lyrics out of a deck |
| `lib/match.py` | title matching |
| `template.pptx` | the house style — restyle this to change the look |
| `songs-index.json` | generated; safe to delete and rebuild |

## Requirements

`yt-dlp` + `ffmpeg` for the videos. Python 3 with `python-pptx` for the deck:

```powershell
pip install python-pptx
``` PowerPoint for the one-off legacy conversion.

## A note on the PowerShell files

`Convert-Legacy.ps1` and `Get-Songs.ps1` are saved as **ASCII with a UTF-8 BOM
and CRLF line endings**, and that is deliberate.

Windows PowerShell 5.1 assumes a file with no byte-order mark is in the system
ANSI codepage. A UTF-8 em-dash then decodes as `a~EUR"` - and that last
character is a curly closing quote, which PowerShell treats as a string
delimiter. One em-dash inside one quoted string silently ended that string
early and the parser collapsed twenty lines later with "Unexpected token '}'".
The braces were fine the whole time.

Keeping these files plain ASCII with a BOM means no codepage can misread them.
If you edit them, save as "UTF-8 with BOM" and avoid smart quotes and dashes.

They also avoid PowerShell 7-only syntax - notably `??`, which 5.1 does not
have - so they run on a stock Windows install.

## Still open

- The videos step and the deck step are separate commands. They could be one,
  but they fail in different ways and it is clearer to see which did what.
- Sharing the folder with Lawson on Friday is still manual.
- `16 February song set.pptx` needs splitting by hand if those songs are wanted.
