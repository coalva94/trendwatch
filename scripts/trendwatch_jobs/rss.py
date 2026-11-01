from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime

from trendwatch_jobs.errors import FeedError
from trendwatch_jobs.models import ParsedEntry
from trendwatch_jobs.ssrf import fetch_public, socket_resolver, urllib_opener

MAX_ENTRIES = 30


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1].lower()


def _strip(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value)
    return re.sub(r"\s+", " ", text).strip()[:500]


def parse_datetime(value: str | None) -> str | None:
    if not value:
        return None
    raw = value.strip()
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = parsedate_to_datetime(raw)
        except (TypeError, ValueError, IndexError):
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_feed(xml_text: str) -> list[ParsedEntry]:
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError as exc:
        raise FeedError("XML no válido") from exc
    entries: list[ParsedEntry] = []
    for node in root.iter():
        if _local(node.tag) not in {"item", "entry"}:
            continue
        title = ""
        link = ""
        guid = ""
        summary = ""
        published: str | None = None
        for child in list(node):
            name = _local(child.tag)
            text = (child.text or "").strip()
            if name == "title" and text:
                title = _strip(text)
            elif name in {"description", "summary", "content"} and text and not summary:
                summary = _strip(text)
            elif name in {"guid", "id"} and text:
                guid = text
            elif name in {"pubdate", "published", "updated"} and text and published is None:
                published = text
            elif name == "link":
                href = child.attrib.get("href", "").strip()
                rel = child.attrib.get("rel")
                if href and rel in {None, "alternate"} and not link:
                    link = href
                elif text.startswith("http") and not link:
                    link = text
        if not title:
            continue
        external_id = guid or link or title
        entries.append(
            ParsedEntry(
                external_id=external_id[:500],
                title=title[:300],
                url=link or "https://news.google.com/search?q=" + urllib_quote(title),
                summary=summary,
                published_at=parse_datetime(published),
            )
        )
        if len(entries) >= MAX_ENTRIES:
            break
    if not entries:
        raise FeedError("El feed no parece RSS o Atom")
    return entries


def urllib_quote(value: str) -> str:
    from urllib.parse import quote

    return quote(value)


def read_feed(url: str) -> list[ParsedEntry]:
    body = fetch_public(url, resolver=socket_resolver, opener=urllib_opener)
    lowered = body[:4000].lower()
    if "<rss" not in lowered and "<feed" not in lowered and "<rdf:rdf" not in lowered:
        raise FeedError("El feed no parece RSS o Atom")
    return parse_feed(body)
