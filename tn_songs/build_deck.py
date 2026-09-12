#!/usr/bin/env python3
"""
tn_songs/build_deck.py

Builds the Sunday lyrics deck in the house style.

The design — warm cream ground, bronze rule, Segoe UI, 66pt song titles over
40pt lyrics — is not recreated here. It is inherited, by using an existing deck
as the template and cloning its two slide archetypes:

    slide 1   the song title card   ("TextBox 7" + the "Accent Rule" shape)
    slide 2   a page of lyrics      ("Rectangle 2", runs separated by <a:br/>)

Cloning rather than rebuilding matters. The library's older decks were made in
Verdana 100pt, Tahoma 44pt, Gotham and three different Office themes; a deck
assembled from those would be a patchwork. Everything this tool emits is
byte-identical in styling to the template it came from.

Usage:
    python build_deck.py --template TEMPLATE.pptx --songs songs.json \\
                         --out "September 13.pptx"

songs.json:
    [
      {"title": "Holy Forever",
       "slides": [["line one", "line two"], ["next page", "..."]]},
      ...
    ]
"""

from __future__ import annotations

import argparse
import copy
import json
import shutil
import sys
import zipfile
from pathlib import Path

from pptx import Presentation

sys.path.insert(0, str(Path(__file__).parent))
from lib.pptx_clone import clone_slide, set_slide_order, drop_unused_slides  # noqa: E402

A_NS = "{http://schemas.openxmlformats.org/drawingml/2006/main}"

TITLE_PROTOTYPE = "slide1.xml"  # song title card
LYRIC_PROTOTYPE = "slide2.xml"  # a page of lyrics

TITLE_SHAPE = "textbox 7"
LYRIC_SHAPE = "rectangle 2"
ACCENT_SHAPE = "accent rule"


# ── Slide plumbing ───────────────────────────────────────────────────────────


def unpack(pptx: Path, into: Path) -> None:
    if into.exists():
        shutil.rmtree(into)
    into.mkdir(parents=True)
    with zipfile.ZipFile(pptx) as z:
        z.extractall(into)


def pack(folder: Path, out: Path) -> None:
    if out.exists():
        out.unlink()
    # Written with zipfile rather than the `zip` binary, which Windows has no
    # copy of. Paths must be relative to the package root or PowerPoint gains a
    # stray leading folder and refuses the file.
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for path in sorted(folder.rglob("*")):
            if path.is_file():
                z.write(path, path.relative_to(folder).as_posix())


# ── Filling text ─────────────────────────────────────────────────────────────


def find_shape(slide, wanted: str):
    for shape in slide.shapes:
        if (shape.name or "").strip().lower() == wanted:
            return shape
    return None


def set_single_line(shape, text: str) -> None:
    """
    Replace a shape's text, keeping its run properties.

    Assigning to `text_frame.text` would drop the run's <a:rPr> — the 66pt,
    the colour, the +mj-lt typeface — and leave unstyled text behind. Editing
    the existing run's <a:t> keeps every bit of the template's formatting.
    """
    para = shape.text_frame.paragraphs[0]
    runs = para.runs
    if not runs:
        raise RuntimeError(f"{shape.name}: no run to write into")
    runs[0].text = text
    for extra in runs[1:]:
        extra._r.getparent().remove(extra._r)
    # Drop any leftover line breaks from the prototype's text.
    for br in para._p.findall(f"{A_NS}br"):
        para._p.remove(br)


def set_lines(shape, lines: list[str]) -> None:
    """
    Write several lyric lines into one paragraph, separated by <a:br/>.

    That is exactly how the template stores them, and it is what lets
    PowerPoint's shrink-to-fit treat the block as one unit.
    """
    para = shape.text_frame.paragraphs[0]
    runs = para.runs
    if not runs:
        raise RuntimeError(f"{shape.name}: no run to write into")

    run_prototype = copy.deepcopy(runs[0]._r)
    br_prototype = para._p.find(f"{A_NS}br")
    if br_prototype is None:  # prototype had a single line
        br_prototype = copy.deepcopy(run_prototype)
        for child in list(br_prototype):
            if child.tag != f"{A_NS}rPr":
                br_prototype.remove(child)
        br_prototype.tag = f"{A_NS}br"
    else:
        br_prototype = copy.deepcopy(br_prototype)

    # Clear the paragraph of everything but its properties.
    for child in list(para._p):
        if child.tag != f"{A_NS}pPr":
            para._p.remove(child)

    for index, line in enumerate(lines):
        if index:
            para._p.append(copy.deepcopy(br_prototype))
        run = copy.deepcopy(run_prototype)
        t = run.find(f"{A_NS}t")
        t.text = line
        # Leading or trailing spaces are dropped without this.
        t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        para._p.append(run)


# ── Build ────────────────────────────────────────────────────────────────────


def build(template: Path, songs: list[dict], out: Path, workdir: Path) -> dict:
    unpacked = workdir / "unpacked"
    unpack(template, unpacked)

    plan: list[tuple[str, str, object]] = []  # (kind, slideN.xml, payload)

    for song in songs:
        title_slide = clone_slide(unpacked, TITLE_PROTOTYPE)
        plan.append(("title", title_slide, song["title"]))
        for page in song["slides"]:
            lyric_slide = clone_slide(unpacked, LYRIC_PROTOTYPE)
            plan.append(("lyric", lyric_slide, page))

    order = [name for _, name, _ in plan]
    set_slide_order(unpacked, order)
    drop_unused_slides(unpacked, order)

    staged = workdir / "staged.pptx"
    pack(unpacked, staged)

    # Now fill the text. Slide order in python-pptx follows <p:sldIdLst>, which
    # we just set, so position i corresponds to plan[i].
    prs = Presentation(staged)
    slides = list(prs.slides)
    if len(slides) != len(plan):
        raise RuntimeError(f"expected {len(plan)} slides, deck has {len(slides)}")

    for slide, (kind, _, payload) in zip(slides, plan):
        if kind == "title":
            shape = find_shape(slide, TITLE_SHAPE)
            if shape is None:
                raise RuntimeError("title slide is missing its text box")
            set_single_line(shape, str(payload))
        else:
            shape = find_shape(slide, LYRIC_SHAPE)
            if shape is None:
                raise RuntimeError("lyric slide is missing its body")
            set_lines(shape, list(payload))
            # A lyric slide must never keep the title card's rule.
            accent = find_shape(slide, ACCENT_SHAPE)
            if accent is not None:
                accent._element.getparent().remove(accent._element)

    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(out)

    return {
        "slides": len(plan),
        "songs": len(songs),
        "titles": sum(1 for k, _, _ in plan if k == "title"),
        "lyrics": sum(1 for k, _, _ in plan if k == "lyric"),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--template", required=True, type=Path)
    ap.add_argument("--songs", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--workdir", type=Path, default=Path("./.deckwork"))
    args = ap.parse_args()

    songs = json.loads(args.songs.read_text(encoding="utf8"))
    args.workdir.mkdir(parents=True, exist_ok=True)

    stats = build(args.template, songs, args.out, args.workdir)
    print(
        f"built {args.out}  —  {stats['songs']} song(s), "
        f"{stats['titles']} title + {stats['lyrics']} lyric = {stats['slides']} slides"
    )


if __name__ == "__main__":
    main()
