"""
tn_songs/lib/match.py

Matching the week's song titles against the library.

The same lesson as the worship-leader folders applies, and this library proves
it: "My God Is Good", "My God is Good", "My GOD is good oh" and "My Redeemer
Lives" all live here. A confident wrong match puts the wrong words on a screen
in front of a congregation, so anything short of a clear hit is reported for a
human rather than guessed.
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass

#: Words that carry no identifying weight in a worship song title.
NOISE_WORDS = {
    "the", "a", "an", "of", "to", "and", "is", "in", "my", "our", "your",
    "you", "lyrics", "presentation", "chords", "version", "studio", "live",
    "official", "song", "worship",
}


def normalise(title: str) -> str:
    """Lowercase, strip accents and punctuation, collapse whitespace."""
    text = unicodedata.normalize("NFD", str(title or ""))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.lower()
    text = re.sub(r"[’'`]", "", text)          # don't split "I'm" into two tokens
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return text.strip()


def tokens(title: str) -> list[str]:
    return [t for t in normalise(title).split() if t]


def singular(word: str) -> str:
    """
    Crudest possible stemmer: drop a trailing plural 's'.

    Enough for this job. "I'm trading my sorrow" and "Trading My Sorrows" are
    the same song, and without this they scored as different ones - which
    buried the single genuine mislabelling under seven false alarms.
    """
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def keywords(title: str) -> set[str]:
    """Tokens that actually identify the song."""
    words = {singular(t) for t in tokens(title) if t not in NOISE_WORDS}
    return words or {singular(t) for t in tokens(title)}


def similarity(a: str, b: str) -> float:
    """
    0…1 overlap of the identifying words, by Jaccard index.

    Chosen over edit distance because these titles differ by whole words —
    "My God is Good" vs "My GOD is good oh" — rather than by typos.
    """
    ka, kb = keywords(a), keywords(b)
    if not ka or not kb:
        return 0.0
    return len(ka & kb) / len(ka | kb)


@dataclass
class Match:
    query: str
    key: str | None
    title: str | None
    confidence: str  # exact | strong | weak | none
    score: float
    alternatives: list[str]

    @property
    def usable(self) -> bool:
        """Only exact and strong matches are used without asking."""
        return self.confidence in ("exact", "strong")


def find(query: str, index: dict[str, dict]) -> Match:
    """Match one requested title against the indexed songs."""
    key = normalise(query)
    if key in index:
        return Match(query, key, index[key]["title"], "exact", 1.0, [])

    scored = sorted(
        ((similarity(query, entry["title"]), k, entry["title"]) for k, entry in index.items()),
        reverse=True,
    )
    if not scored:
        return Match(query, None, None, "none", 0.0, [])

    best_score, best_key, best_title = scored[0]
    runners = [t for s, _, t in scored[1:4] if s > 0.3]

    # A near-tie is not a match. Two songs scoring alike means the title does
    # not distinguish them, and picking either is a coin toss.
    contested = len(scored) > 1 and scored[1][0] >= best_score - 0.05 and scored[1][0] > 0.4

    if best_score >= 0.8 and not contested:
        return Match(query, best_key, best_title, "strong", best_score, runners)
    if best_score >= 0.45:
        return Match(query, best_key, best_title, "weak", best_score, runners)
    return Match(query, None, None, "none", best_score, runners)


def parse_song_list(text: str) -> list[dict]:
    """
    Read the week's list: one song per line, `Title | url`, `Title, url`, or
    a bare title. Blank lines and #comments ignored.
    """
    out: list[dict] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue

        url = None
        title = stripped
        m = re.match(r"^(.*?)[\|,\t]\s*(https?://\S+)\s*$", stripped)
        if m:
            title, url = m.group(1).strip(), m.group(2).strip()
        elif re.match(r"^https?://\S+$", stripped):
            title, url = "", stripped

        out.append({"title": title, "url": url})
    return out
