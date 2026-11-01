"""SSRF checks for feed URLs. Keep the rules aligned with lib/feeds/validate.ts."""

from __future__ import annotations

import gzip
import ipaddress
import socket
import urllib.error
import urllib.parse
import urllib.request

from trendwatch_jobs.errors import FeedError
from trendwatch_jobs.models import HttpResult

USER_AGENT = "Trendwatch/0.1 (+https://github.com/coalva94/trendwatch)"
MAX_BYTES = 1_000_000
MAX_REDIRECTS = 3
BLOCKED_HOSTS = {
    "localhost",
    "localhost.localdomain",
    "metadata.google.internal",
    "metadata.google.com",
}


def is_private_address(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return True
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _hostname_blocked(hostname: str) -> bool:
    host = hostname.rstrip(".").lower()
    if not host or host in BLOCKED_HOSTS:
        return True
    if host.endswith((".local", ".localhost", ".localdomain", ".internal")):
        return True
    labels = host.split(".")
    if all(label.isdigit() for label in labels) and len(labels) != 4:
        return True
    return False


def assert_public_http_url(raw: str, resolver) -> str:
    try:
        parts = urllib.parse.urlsplit(raw.strip())
    except ValueError as exc:
        raise FeedError("URL no válida") from exc
    if parts.scheme not in {"http", "https"}:
        raise FeedError("Solo se permiten http y https")
    if parts.username or parts.password:
        raise FeedError("La URL no puede incluir usuario o contraseña")
    if parts.port not in (None, 80, 443):
        raise FeedError("Puerto no permitido")
    host = parts.hostname or ""
    if _hostname_blocked(host):
        raise FeedError("Host no permitido")
    try:
        literal = ipaddress.ip_address(host)
        addresses = [str(literal)]
    except ValueError:
        try:
            addresses = list(resolver(host))
        except OSError as exc:
            raise FeedError("No se pudo resolver el host") from exc
    if not addresses:
        raise FeedError("No se pudo resolver el host")
    if any(is_private_address(address) for address in addresses):
        raise FeedError("La dirección es privada o no enrutable")
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path or "/", parts.query, ""))


def fetch_public(url: str, *, resolver, opener, hops: int = 0) -> str:
    safe = assert_public_http_url(url, resolver)
    result = opener(safe)
    if 300 <= result.status < 400:
        if hops >= MAX_REDIRECTS:
            raise FeedError("Demasiadas redirecciones")
        location = result.headers.get("location") or result.headers.get("Location")
        if not location:
            raise FeedError("Demasiadas redirecciones")
        return fetch_public(urllib.parse.urljoin(safe, location), resolver=resolver, opener=opener, hops=hops + 1)
    if result.status < 200 or result.status >= 300:
        raise FeedError("La fuente respondió con un error")
    body = result.body
    if len(body) > MAX_BYTES:
        raise FeedError("El feed supera el tamaño máximo")
    if body[:2] == b"\x1f\x8b":
        body = gzip.decompress(body)
    if len(body) > MAX_BYTES:
        raise FeedError("El feed supera el tamaño máximo")
    return body.decode("utf-8", errors="replace")


def socket_resolver(hostname: str) -> list[str]:
    infos = socket.getaddrinfo(hostname, None)
    return sorted({item[4][0] for item in infos})


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


def urllib_opener(url: str) -> HttpResult:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
            "Accept-Encoding": "gzip",
        },
        method="GET",
    )
    opener = urllib.request.build_opener(_NoRedirect)
    try:
        with opener.open(request, timeout=10) as response:
            return HttpResult(
                status=getattr(response, "status", 200),
                headers={key.lower(): value for key, value in response.headers.items()},
                body=response.read(MAX_BYTES + 1),
            )
    except urllib.error.HTTPError as exc:
        return HttpResult(
            status=exc.code,
            headers={key.lower(): value for key, value in exc.headers.items()},
            body=exc.read(4096),
        )
