#!/usr/bin/env python3
"""
tn_songs/week.py

Turns Elga's list into the Sunday lyrics deck.

    python week.py --songs songs.txt --date 2026-09-13

songs.txt is Elga's message, one song per line:

    Holy Forever | https://www.youtube.com/watch?v=xxxxxxxxxxx
    Goodness of God, https://youtu.be/yyyyyyyyyyy
    The Blessing

Links are ignored here — Get-Songs.ps1 handles the videos. This half only
cares about the words.

What it will not do: invent lyrics. A song that is not in the library is
reported, and the deck is built from the rest. Paste that song's lyrics into a
.txt beside songs.txt (named after the song) and re-run, and it fills in.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
try:
    from build_deck import build  # noqa: E402
    from lib.match import find, parse_song_list, normalise  # noqa: E402
except ModuleNotFoundError as exc:
    if exc.name == "pptx":
        sys.exit(
            "python-pptx is not installed - it is what writes the deck.\n\n"
            "    pip install python-pptx\n"
        )
    raise

GREEN, YELLOW, RED, DIM, BOLD, OFF = (
    "\033[32m", "\033[33m", "\033[31m", "\033[2m", "\033[1m", "\033[0m",
)


def upcoming_sunday(today: date | None = None) -> date:
    """The coming Sunday, or today when today is Sunday."""
    today = today or date.today()
    return today + timedelta(days=(6 - today.weekday()) % 7)


def folder_name(day: date) -> str:
    """`September 13` — zero-padded, matching most of the existing folders."""
    return f"{day.strftime('%B')} {day.day:02d}"


def load_supplied_lyrics(folder: Path, title: str) -> list[list[str]] | None:
    """
    Lyrics you pasted into a .txt for a song the library does not have.

    Blank lines separate slides; everything else is one line of lyric. Matched
    on a normalised filename, so `Way Maker.txt` answers for "Way maker".
    """
    if not folder.exists():
        return None

    wanted = normalise(title)
    for candidate in folder.glob("*.txt"):
        if normalise(candidate.stem) != wanted:
            continue
        blocks = candidate.read_text(encoding="utf8").split("\n\n")
        slides = [
            [ln.strip() for ln in block.splitlines() if ln.strip()]
            for block in blocks
        ]
        return [s for s in slides if s]
    return None


def main() -> None:
    here = Path(__file__).parent
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--songs", required=True, type=Path, help="Elga's list")
    ap.add_argument("--date", help="YYYY-MM-DD (default: the coming Sunday)")
    ap.add_argument("--index", type=Path, default=here / "songs-index.json")
    ap.add_argument("--template", type=Path, default=here / "template.pptx")
    ap.add_argument(
        "--out-root",
        type=Path,
        default=Path(
            r"C:\Users\serve\OneDrive\MEDIA SHARE\THAI NGUYEN FELLOWSHIP\Thai Nguyen Worship Songs"
        ),
    )
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    sunday = date.fromisoformat(args.date) if args.date else upcoming_sunday()
    name = folder_name(sunday)
    dest_dir = args.out_root / str(sunday.year) / name
    dest = dest_dir / f"{name}.pptx"

    print(f"\n{BOLD}Thai Nguyen lyrics deck{OFF}")
    print(f"{DIM}{sunday:%A, %d %B %Y}  →  {dest}{OFF}\n")

    index = json.loads(args.index.read_text(encoding="utf8"))["songs"]
    requested = parse_song_list(args.songs.read_text(encoding="utf8"))
    if not requested:
        sys.exit("No songs found in that list.")

    ready: list[dict] = []
    missing: list[dict] = []

    for item in requested:
        title = item["title"]
        if not title:
            missing.append({"title": "(link only, no title given)", "why": "no title"})
            continue

        supplied = load_supplied_lyrics(args.songs.parent, title)
        if supplied:
            ready.append({"title": title, "slides": supplied})
            print(f"  {GREEN}✓{OFF} {title[:34]:36}{DIM}from your .txt — {len(supplied)} slide(s){OFF}")
            continue

        match = find(title, index)
        if match.usable and match.key:
            entry = index[match.key]
            ready.append({"title": title, "slides": entry["slides"]})
            src = Path(entry["source"]).name
            print(
                f"  {GREEN}✓{OFF} {title[:34]:36}{DIM}{match.confidence} match → {entry['title'][:28]} "
                f"({len(entry['slides'])} slides, from {src}){OFF}"
            )
        else:
            hint = ""
            if match.title:
                hint = f"closest: {match.title} ({match.score:.0%})"
            elif match.alternatives:
                hint = f"maybe: {', '.join(match.alternatives[:2])}"
            mark = YELLOW if match.confidence == "weak" else RED
            print(f"  {mark}✗{OFF} {title[:34]:36}{DIM}not in the library. {hint}{OFF}")
            missing.append({"title": title, "why": match.confidence, "hint": hint})

    print()
    if not ready:
        print(f"{RED}Nothing to build{OFF} — none of these songs are in the library.\n")
        _explain_missing(missing, args.songs.parent)
        sys.exit(3)

    if args.dry_run:
        total = sum(1 + len(s["slides"]) for s in ready)
        print(f"{DIM}dry run — would build {len(ready)} song(s), {total} slides{OFF}\n")
    else:
        if not args.template.exists():
            sys.exit(f"Template not found: {args.template}")
        stats = build(args.template, ready, dest, here / ".deckwork")
        print(
            f"{GREEN}built{OFF} {dest.name}  {DIM}{stats['songs']} song(s), "
            f"{stats['slides']} slides{OFF}"
        )
        print(f"{DIM}{dest}{OFF}\n")

    if missing:
        _explain_missing(missing, args.songs.parent)
        sys.exit(3)


def _explain_missing(missing: list[dict], folder: Path) -> None:
    print(f"{YELLOW}{len(missing)} song(s) not in the deck:{OFF}")
    for m in missing:
        print(f"   {m['title']}{DIM}  {m.get('hint','')}{OFF}")
    print(
        f"\n{DIM}To add one, save its lyrics as a .txt beside your song list,\n"
        f"named after the song (e.g. {folder / 'Way Maker.txt'}),\n"
        f"with a blank line between each slide. Then run this again.{OFF}\n"
    )


if __name__ == "__main__":
    main()
