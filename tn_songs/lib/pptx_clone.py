"""
tn_songs/lib/pptx_clone.py

Duplicating a slide inside an unpacked .pptx.

python-pptx cannot do this — its only entry point is `add_slide(layout)`, which
builds an empty slide from a layout and loses everything that makes the
template's slides look the way they do. Cloning the slide part itself is the
only way to inherit the exact formatting.

A slide is not one file. Adding one means touching four places, and PowerPoint
refuses to open the deck if any is missed:

    ppt/slides/slideN.xml              the slide
    ppt/slides/_rels/slideN.xml.rels   what it points at (its layout, images)
    [Content_Types].xml                an Override declaring its type
    ppt/_rels/presentation.xml.rels    a relationship from the presentation

Ordering within <p:sldIdLst> is handled separately by the caller.

All edits are done as text. Round-tripping OOXML through a generic XML parser
rewrites namespace prefixes, and a deck that has been through one is rejected
by PowerPoint even though every other tool reads it happily.
"""

from __future__ import annotations

import re
import shutil
from pathlib import Path

SLIDE_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.presentationml.slide+xml"
)
SLIDE_REL_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
)


def _next_slide_number(slides_dir: Path) -> int:
    used = {
        int(m.group(1))
        for f in slides_dir.glob("slide*.xml")
        if (m := re.fullmatch(r"slide(\d+)\.xml", f.name))
    }
    return max(used, default=0) + 1


def _next_rel_id(rels_xml: str) -> str:
    used = {int(m) for m in re.findall(r'Id="rId(\d+)"', rels_xml)}
    return f"rId{max(used, default=0) + 1}"


def clone_slide(unpacked: Path, source: str) -> str:
    """
    Duplicate `source` (e.g. "slide2.xml"), returning the new slide's filename.

    The clone is fully registered but not yet placed in the running order —
    call the caller's slide-order routine once every slide exists.
    """
    slides = unpacked / "ppt" / "slides"
    src = slides / source
    if not src.exists():
        raise FileNotFoundError(f"no such slide: {src}")

    number = _next_slide_number(slides)
    name = f"slide{number}.xml"
    shutil.copyfile(src, slides / name)

    # 1. Its relationships — carries the link to the slide layout, without
    #    which PowerPoint cannot lay the slide out at all.
    src_rels = slides / "_rels" / f"{source}.rels"
    if src_rels.exists():
        (slides / "_rels").mkdir(exist_ok=True)
        shutil.copyfile(src_rels, slides / "_rels" / f"{name}.rels")

    # 2. Declare the part's content type.
    ct_path = unpacked / "[Content_Types].xml"
    ct = ct_path.read_text(encoding="utf8")
    override = f'<Override PartName="/ppt/slides/{name}" ContentType="{SLIDE_CONTENT_TYPE}"/>'
    if override not in ct:
        ct = ct.replace("</Types>", f"{override}</Types>")
        ct_path.write_text(ct, encoding="utf8")

    # 3. Relate it to the presentation.
    pres_rels_path = unpacked / "ppt" / "_rels" / "presentation.xml.rels"
    pres_rels = pres_rels_path.read_text(encoding="utf8")
    rid = _next_rel_id(pres_rels)
    rel = (
        f'<Relationship Id="{rid}" Type="{SLIDE_REL_TYPE}" Target="slides/{name}"/>'
    )
    pres_rels = pres_rels.replace("</Relationships>", f"{rel}</Relationships>")
    pres_rels_path.write_text(pres_rels, encoding="utf8")

    return name


def set_slide_order(unpacked: Path, order: list[str]) -> None:
    """
    Rewrite <p:sldIdLst> so the deck presents in `order`.

    Any slide part not named here stays in the package but is not shown, which
    is how the template's own slides drop out of the finished deck.
    """
    pres_path = unpacked / "ppt" / "presentation.xml"
    xml = pres_path.read_text(encoding="utf8")
    rels = (unpacked / "ppt" / "_rels" / "presentation.xml.rels").read_text(encoding="utf8")

    rid_of = {
        m.group(2): m.group(1)
        for m in re.finditer(r'Id="([^"]+)"[^>]*Target="slides/(slide\d+\.xml)"', rels)
    }

    missing = [s for s in order if s not in rid_of]
    if missing:
        raise RuntimeError(f"slides with no relationship: {missing}")

    entries = "".join(
        f'<p:sldId id="{256 + i}" r:id="{rid_of[name]}"/>' for i, name in enumerate(order)
    )
    if "<p:sldIdLst>" in xml:
        xml = re.sub(
            r"<p:sldIdLst>.*?</p:sldIdLst>", f"<p:sldIdLst>{entries}</p:sldIdLst>", xml, flags=re.S
        )
    else:  # a template with no slides at all
        xml = xml.replace("<p:sldSz", f"<p:sldIdLst>{entries}</p:sldIdLst><p:sldSz")
    pres_path.write_text(xml, encoding="utf8")


def drop_unused_slides(unpacked: Path, keep: list[str]) -> int:
    """
    Delete slide parts left out of the running order, and their registrations.

    Without this the finished file still carries the template's original
    slides — invisible in the deck, but bloating it and confusing anyone who
    unpacks it later.
    """
    slides = unpacked / "ppt" / "slides"
    keep_set = set(keep)
    removed = 0

    ct_path = unpacked / "[Content_Types].xml"
    ct = ct_path.read_text(encoding="utf8")
    pres_rels_path = unpacked / "ppt" / "_rels" / "presentation.xml.rels"
    pres_rels = pres_rels_path.read_text(encoding="utf8")

    for path in sorted(slides.glob("slide*.xml")):
        if path.name in keep_set:
            continue
        path.unlink()
        rels = slides / "_rels" / f"{path.name}.rels"
        if rels.exists():
            rels.unlink()
        ct = re.sub(rf'<Override PartName="/ppt/slides/{re.escape(path.name)}"[^>]*/>', "", ct)
        pres_rels = re.sub(
            rf'<Relationship[^>]*Target="slides/{re.escape(path.name)}"[^>]*/>', "", pres_rels
        )
        removed += 1

    ct_path.write_text(ct, encoding="utf8")
    pres_rels_path.write_text(pres_rels, encoding="utf8")
    return removed
