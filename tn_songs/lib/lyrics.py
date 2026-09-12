"""
tn_songs/lib/lyrics.py

Pulling the words out of a lyric deck.

The library is 15 years of decks made by different people in different tools,
and they agree on almost nothing. Across the 20 decks sampled:

  * Section markers appear as `VERSE1`, `VERSE 1`, `[Verse 1]`, `CHORUS`,
    `PRE-CHORUS`, `[BRIDGE]`, `Chorus 1`, `Verse1-1` — sometimes in their own
    shape, sometimes as the first line of the lyric text itself.
  * Some decks open with a title slide, some with the artist under it, some
    with a "LYRICS PRESENTATION" subtitle, and some go straight into verse one.
  * Some carry a slide number in its own little text box.
  * One deck ("To be the Glory") has no text at all — the lyrics are images.

So extraction is deliberately conservative: it strips what it is confident is
not a lyric, keeps everything else, and reports anything it could not read
rather than returning a plausible-looking half-song.

Line breaks matter here. PowerPoint stores a soft line break as <a:br/> inside
a paragraph, and that is how nearly every one of these decks separates lyric
lines — one paragraph, many breaks. Reading `paragraph.text` glues the lines
together into "Oh be lifted above all other godsWe lay our crowns", which would
put a wall of text on screen. So runs and breaks are walked directly.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from pptx import Presentation
from pptx.util import Emu

A_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"

# ── What is not a lyric ──────────────────────────────────────────────────────

SECTION_WORDS = (
    r"verse|chorus|pre[\s\-]?chorus|bridge|tag|intro|outro|refrain|ending|"
    r"vamp|interlude|instrumental|repeat|coda|hook"
)

#: A whole line that is only a section marker: "CHORUS", "[Verse 2]", "Verse1-1".
SECTION_LINE = re.compile(
    rf"^\s*[\[\(]?\s*(?:{SECTION_WORDS})\s*[\d\s\-–]*\s*[\]\)]?\s*[:.]?\s*$",
    re.IGNORECASE,
)

#: A marker glued to the front of a lyric line: "VERSE1A thousand generations".
SECTION_PREFIX = re.compile(
    rf"^\s*[\[\(]?\s*(?:{SECTION_WORDS})\s*\d*\s*[\]\)]?\s*(?=[A-Z(])",
    re.IGNORECASE,
)

#: Slide numbers and other furniture that is not sung.
NOISE_LINE = re.compile(
    r"^\s*(?:\d{1,3}|lyrics\s*presentation|lyrics|slide\s*\d+|"
    r"\(?\s*(?:studio|live|official)\s*version\s*\)?)\s*$",
    re.IGNORECASE,
)


def is_section(line: str) -> bool:
    return bool(SECTION_LINE.match(line))


def is_noise(line: str) -> bool:
    return bool(NOISE_LINE.match(line))


def strip_section_prefix(line: str) -> str:
    """Remove a section marker glued to the start of a lyric line."""
    out = SECTION_PREFIX.sub("", line, count=1)
    return out if out.strip() else line


# ── Reading a shape ──────────────────────────────────────────────────────────


def shape_lines(shape) -> list[str]:
    """
    Every line of text in a shape, with <a:br/> treated as a line break.

    python-pptx's `.text` concatenates runs and drops soft breaks, which is how
    five separate lyric lines become one unreadable string. Walking the XML is
    the only way to see the breaks the deck actually has.
    """
    if not shape.has_text_frame:
        return []

    lines: list[str] = []
    for para in shape.text_frame.paragraphs:
        current = ""
        for node in para._p:
            tag = node.tag
            if tag == f"{A_NS}r":  # a run
                t = node.find(f"{A_NS}t")
                if t is not None and t.text:
                    current += t.text
            elif tag == f"{A_NS}br":  # soft line break
                lines.append(current)
                current = ""
            elif tag == f"{A_NS}fld":  # slide-number field and similar
                t = node.find(f"{A_NS}t")
                if t is not None and t.text:
                    current += t.text
        lines.append(current)

    return [ln.strip() for ln in lines]


@dataclass
class SongSlide:
    """One slide's worth of lyrics, exactly as the source deck broke them."""

    lines: list[str]

    def __bool__(self) -> bool:
        return bool(self.lines)


@dataclass
class Song:
    title: str
    slides: list[SongSlide] = field(default_factory=list)
    source: str = ""
    notes: list[str] = field(default_factory=list)

    @property
    def line_count(self) -> int:
        return sum(len(s.lines) for s in self.slides)


def clean_lines(raw: list[str]) -> list[str]:
    """Drop markers, numbers and blanks; unglue markers stuck to lyrics."""
    out: list[str] = []
    for line in raw:
        if not line.strip():
            continue
        if is_section(line) or is_noise(line):
            continue
        out.append(strip_section_prefix(line).strip())
    return [ln for ln in out if ln]


#: Shape that only ever appears on a title slide in the house template.
TEMPLATE_TITLE_MARKER = "accent rule"


def has_template_title_marker(slide) -> bool:
    """True for a title slide in a deck built from the house template."""
    return any(
        (shape.name or "").strip().lower() == TEMPLATE_TITLE_MARKER for shape in slide.shapes
    )


def looks_like_opening_title(slide, lines: list[str]) -> bool:
    """
    Whether the FIRST slide of a deck is a title card rather than lyrics.

    Only ever applied to slide 1. Trying to spot title slides mid-deck by
    appearance does not work in this library: "Our God" sets its lyrics in 66pt
    and several of its lines are short enough to pass any such test, which split
    one song into seven. Where a deck is built from the house template the
    "Accent Rule" shape says so exactly, and that is used instead of guessing.
    """
    if not lines or len(lines) > 2:
        return False
    return len(lines[0]) <= 60


# ── Songbooks ────────────────────────────────────────────────────────────────
#
# One file in this library is not a deck of one song but a whole hymnal: 354
# slides holding 135 songs, alphabetically. Its structure is rigid and obvious —
# every slide carries a short BOLD title shape and a separate lyrics shape, and
# a song that runs over several slides simply repeats its title. That is real,
# checkable structure rather than a guess, so it is worth reading properly:
# skipping the file would throw away three quarters of the available songs.


def _title_and_body(slide) -> tuple[str, list[str]] | None:
    """A slide's (bold title, lyric lines), if it is shaped like a songbook page."""
    title = None
    body: list[str] = []

    for shape in slide.shapes:
        if not shape.has_text_frame:
            continue
        lines = [ln for ln in shape_lines(shape) if ln.strip()]
        if not lines:
            continue

        first_para = shape.text_frame.paragraphs[0]
        is_bold = any(run.font.bold for run in first_para.runs)

        if title is None and is_bold and len(lines) <= 2 and len(lines[0]) <= 70:
            title = lines[0].strip()
        else:
            body.extend(lines)

    if title is None:
        return None
    return title, body


def looks_like_songbook(prs, min_slides: int = 30, min_titles: int = 10) -> bool:
    """
    Whether a deck is a hymnal rather than a single song.

    Requires real evidence on three counts: length, a bold title on most
    slides, and many DIFFERENT titles. A long single song repeats one title or
    has none, so it cannot pass.
    """
    slides = list(prs.slides)
    if len(slides) < min_slides:
        return False

    titles = [t for s in slides if (parsed := _title_and_body(s)) for t in [parsed[0]]]
    if len(titles) < len(slides) * 0.6:
        return False
    return len({t.lower() for t in titles}) >= min_titles


def extract_songbook(path: str) -> list[Song]:
    """Read a hymnal into one Song per title, merging a song's consecutive pages."""
    prs = Presentation(path)
    songs: list[Song] = []
    current_key = None

    for slide in prs.slides:
        parsed = _title_and_body(slide)
        if parsed is None:
            continue
        title, body = parsed
        lines = clean_lines(body)
        if not lines:
            continue

        key = re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()
        if key != current_key:
            songs.append(Song(title=title.strip(), source=path))
            current_key = key
        songs[-1].slides.append(SongSlide(lines=lines))

    for song in songs:
        song.notes.append("from a songbook file")
    return songs


def extract_songs(path: str, fallback_title: str = "", multi: bool = False) -> list[Song]:
    """
    Read a deck into songs.

    Single-song by default, because that is what all but a handful of these
    files are and because mid-deck splitting cannot be done reliably by
    appearance alone.

    `multi=True` handles combined sets — the 32-slide "16 February song set",
    and every deck this tool produces from now on. It splits only on the
    template's "Accent Rule" marker, never on a guess, so a combined deck
    without that marker returns one song and says so.
    """
    prs = Presentation(path)

    if looks_like_songbook(prs):
        return extract_songbook(path)

    slides = list(prs.slides)

    parsed: list[tuple[bool, list[str]]] = []
    for slide in slides:
        raw: list[str] = []
        for shape in slide.shapes:
            raw.extend(shape_lines(shape))
        parsed.append((has_template_title_marker(slide), clean_lines(raw)))

    templated = any(is_title for is_title, _ in parsed)

    songs: list[Song] = []
    current: Song | None = None

    for index, (is_template_title, lines) in enumerate(parsed):
        if not lines:
            continue

        starts_a_song = (
            (multi and templated and is_template_title)
            or (index == 0 and looks_like_opening_title(slides[index], lines))
        )

        if starts_a_song:
            current = Song(title=lines[0].strip(), source=path)
            songs.append(current)
            continue

        if current is None:
            current = Song(title=fallback_title, source=path)
            songs.append(current)

        current.slides.append(SongSlide(lines=lines))

    if multi and not templated and len(songs) == 1:
        songs[0].notes.append(
            "combined deck without template markers — read as one song, split by hand"
        )

    for song in songs:
        if not song.slides:
            song.notes.append("title slide only, no lyrics found")
        if not song.title:
            song.title = fallback_title

    if not songs:
        return [
            Song(
                title=fallback_title,
                source=path,
                notes=["no readable text — the lyrics are probably images"],
            )
        ]

    return songs
