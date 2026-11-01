from __future__ import annotations

import hashlib
import re

STOP = {
    "a",
    "an",
    "the",
    "of",
    "and",
    "or",
    "to",
    "for",
    "in",
    "on",
    "with",
    "from",
    "by",
    "at",
    "as",
    "is",
    "are",
    "was",
    "were",
    "be",
    "this",
    "that",
    "it",
    "its",
    "their",
    "his",
    "her",
    "over",
    "after",
    "amid",
    "says",
    "said",
    "report",
    "reports",
    "into",
    "than",
    "also",
    "may",
    "can",
    "not",
    "but",
    "you",
    "our",
    "out",
    "per",
    "via",
    "due",
    "new",
    "more",
    "latest",
    "update",
    "across",
    "about",
    "again",
    "could",
    "ahead",
    "sees",
    "draws",
    "before",
    "during",
    "under",
    "while",
    "where",
    "which",
    "have",
    "has",
    "been",
    "will",
    "its",
}

ALIASES = {
    "spanish": "spain",
    "gigawatt": "gw",
    "gigawatts": "gw",
    "photovoltaic": "pv",
    "photovoltaics": "pv",
    "electrolyzer": "electrolyser",
    "batteries": "battery",
    "prices": "price",
    "modules": "module",
    "turbines": "turbine",
}

KEEP_SHORT = {"gw", "pv", "lfp", "eu", "us"}


def _normalize_token(token: str) -> str:
    token = ALIASES.get(token, token)
    if len(token) > 4 and token.endswith("s") and token not in {"news", "series", "analysis"}:
        token = ALIASES.get(token[:-1], token[:-1])
    return token


def tokens(title: str) -> set[str]:
    cleaned = re.sub(r"[^a-z0-9.\s]", " ", title.lower())
    found: set[str] = set()
    for part in cleaned.split():
        part = part.strip(".")
        if not part:
            continue
        part = _normalize_token(part)
        if part in STOP:
            continue
        if len(part) >= 3 or any(character.isdigit() for character in part) or part in KEEP_SHORT:
            found.add(part)
    return found


def pair_score(left: set[str], right: set[str]) -> float:
    if not left or not right:
        return 0.0
    return len(left & right) / min(len(left), len(right))


def fingerprint_for(titles: list[str]) -> str:
    sets = [tokens(title) for title in titles]
    shared = set.intersection(*sets) if sets else set()
    basis = shared or (sets[0] if sets else set())
    key = " ".join(sorted(basis))
    return hashlib.sha1(key.encode()).hexdigest()[:16]


def group_ids(
    records: list[tuple[str, str]],
    same_story,
    *,
    link_at: float = 0.42,
    ask_at: float = 0.34,
) -> list[list[str]]:
    """Group item ids whose titles describe the same story.

    A high token overlap links them directly. A gray-zone overlap asks the model.
    `same_story` may be None when no model is configured.
    """
    parent = list(range(len(records)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    def union(left: int, right: int) -> None:
        root_left, root_right = find(left), find(right)
        if root_left != root_right:
            parent[root_right] = root_left

    token_sets = [tokens(title) for _, title in records]
    for i in range(len(records)):
        for j in range(i + 1, len(records)):
            shared = token_sets[i] & token_sets[j]
            if len(shared) < 2:
                continue
            score = pair_score(token_sets[i], token_sets[j])
            if score >= link_at and len(shared) >= 3:
                union(i, j)
            elif score >= ask_at and same_story is not None and same_story(records[i][1], records[j][1]):
                union(i, j)
    groups: dict[int, list[str]] = {}
    for index, (item_id, _title) in enumerate(records):
        groups.setdefault(find(index), []).append(item_id)
    return list(groups.values())
