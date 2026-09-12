#!/usr/bin/env python3
"""
tn_songs/index_library.py

Reads every lyric deck in the library into one JSON index, so building a
Sunday deck is a lookup rather than a re-typing job.

The library is worth indexing: 99 files, 48 distinct songs, and heavy reuse —
"Holy Forever" has been used 8 times, "Our God" and "I'm Trading My Sorrow" 7
each. Most weeks are mostly songs you have already built.

Only .pptx is readable. Run Convert-Legacy.ps1 first to bring the 54 legacy
.ppt files into range; anything still unreadable is listed in the index under
"unreadable" rather than silently dropped.

Usage:
    python index_library.py --library DIR --out songs-index.json
    python index_library.py --library DIR --out songs-index.json --multi "16 February song set"
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

try:
    from lib.lyrics import extract_songs  # noqa: E402
    from lib.match import normalise, similarity, keywords  # noqa: E402
except ModuleNotFoundError as exc:
    if exc.name == "pptx":
        sys.exit(
            "python-pptx is not installed - it is what reads .pptx files.\n\n"
            "    pip install python-pptx\n"
        )
    raise

#: A song longer than this is almost certainly several songs in one file.
#:
#: Set to 30 after "What A Beautiful Name" - a genuine 20-slide song - was
#: wrongly thrown out at 18. Real hymnals are now recognised by their structure
#: (a bold title on every slide) rather than by length, so this only has to
#: catch the untidy middle ground.
MAX_PLAUSIBLE_SLIDES = 30

#: Where the song library lives. Passing --library overrides it.
DEFAULT_LIBRARY = Path(
    r"C:\Users\serve\OneDrive\MEDIA SHARE\THAI NGUYEN FELLOWSHIP\Thai Nguyen Worship Songs"
)


def _one_name_contains_the_other(a: str, b: str) -> bool:
    """True when one title's words are all present in the other's."""
    ka, kb = keywords(a), keywords(b)
    if not ka or not kb:
        return False
    return ka <= kb or kb <= ka


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--library",
        type=Path,
        default=DEFAULT_LIBRARY,
        help=f"song library root (default: {DEFAULT_LIBRARY})",
    )
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument(
        "--max-slides",
        type=int,
        default=MAX_PLAUSIBLE_SLIDES,
        help=f"a 'song' longer than this is treated as a combined set (default {MAX_PLAUSIBLE_SLIDES})",
    )
    args = ap.parse_args()

    if not args.library.exists():
        sys.exit(
            f"Song library not found:\n    {args.library}\n\n"
            "Pass the real folder with --library, or edit DEFAULT_LIBRARY at the\n"
            "top of this file."
        )

    decks = sorted(args.library.rglob("*.pptx"))

    if not decks:
        sys.exit(f"No .pptx files under {args.library}. Run Convert-Legacy.ps1 first?")

    songs: dict[str, dict] = {}
    unreadable: list[dict] = []
    suspect: list[dict] = []
    mislabelled: list[dict] = []
    seen_files = 0

    for deck in decks:
        stem = deck.stem
        seen_files += 1
        try:
            # Always split: extract_songs only ever splits on the template's
            # own marker, so there is nothing to opt into and no guessing.
            extracted = extract_songs(str(deck), fallback_title=stem, multi=True)
        except Exception as exc:  # a corrupt or exotic file should not stop the run
            unreadable.append({"file": str(deck), "reason": f"{type(exc).__name__}: {exc}"})
            continue

        for song in extracted:
            if not song.slides:
                unreadable.append(
                    {"file": str(deck), "title": song.title, "reason": "; ".join(song.notes) or "no lyrics"}
                )
                continue

            if len(song.slides) > args.max_slides:
                suspect.append(
                    {
                        "file": str(deck),
                        "title": song.title,
                        "slides": len(song.slides),
                        "reason": (
                            f"{len(song.slides)} slides - too long for one song. Almost "
                            "certainly a combined set with no title markers. Split it by "
                            "hand, or open it and save each song separately."
                        ),
                    }
                )
                continue

            key = normalise(song.title)
            entry = {
                "title": song.title,
                "slides": [s.lines for s in song.slides],
                "source": str(deck),
                "lines": song.line_count,
                "notes": song.notes,
            }

            # A title that looks nothing like its filename means someone saved
            # one song under another song's name. Worth a human's eye: the
            # lyrics are real, but the label they are filed under may be wrong.
            #
            # Two things that are NOT mislabelling, and would otherwise dominate
            # the report:
            #   * a deck holding several songs - its filename is a date, and no
            #     song inside it can be expected to match;
            #   * a filename that says more than the slide does, like
            #     "Hallelujah(you have won the victory)" for "Hallelujah".
            if len(extracted) == 1 and not _one_name_contains_the_other(song.title, stem):
                if similarity(song.title, stem) < 0.34:
                    mislabelled.append(
                        {"file": str(deck), "slide_title": song.title, "filename": stem}
                    )

            # Prefer the version with more lyrics: the same song often appears
            # several times, and the fullest copy is the useful one.
            existing = songs.get(key)
            if existing is None or entry["lines"] > existing["lines"]:
                songs[key] = entry

    index = {
        "songs": songs,
        "unreadable": unreadable,
        "suspect": suspect,
        "mislabelled": mislabelled,
        "stats": {
            "files_read": seen_files,
            "songs_indexed": len(songs),
            "unreadable": len(unreadable),
            "suspect": len(suspect),
            "mislabelled": len(mislabelled),
        },
    }

    args.out.write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf8")

    print(f"read {seen_files} deck(s) -> {len(songs)} song(s) indexed")

    if unreadable:
        print(f"\n{len(unreadable)} could not be read:")
        for u in unreadable:
            print(f"  {Path(u['file']).name:44} {u['reason']}")

    if suspect:
        print(f"\n{len(suspect)} left out as combined sets:")
        for s_ in suspect:
            print(f"  {Path(s_['file']).name:44} {s_['slides']} slides as '{s_['title']}'")
        print("  These hold several songs under one title. Split them to use them.")

    if mislabelled:
        # The same song sits in a dozen Sunday folders; report the name clash
        # once, with a count, rather than once per copy.
        grouped: dict[tuple[str, str], int] = {}
        for m in mislabelled:
            grouped[(Path(m["file"]).name, m["slide_title"])] = (
                grouped.get((Path(m["file"]).name, m["slide_title"]), 0) + 1
            )
        print(f"\n{len(grouped)} filed under a name that does not match their title:")
        for (fname, said), count in sorted(grouped.items()):
            copies = f"  ({count} copies)" if count > 1 else ""
            print(f"  {fname:40} says '{said}'{copies}")
        print("  The lyrics are indexed under the title on the slide, not the filename.")
        print("  Worth opening these to check which is right.")
    print(f"\nwritten to {args.out}")


if __name__ == "__main__":
    main()
