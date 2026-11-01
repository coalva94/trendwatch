from trendwatch_jobs.errors import FeedError
from trendwatch_jobs.models import HttpResult
from trendwatch_jobs.ssrf import assert_public_http_url, fetch_public, is_private_address

RSS = b"<?xml version='1.0'?><rss version='2.0'><channel><item><title>Hola</title></item></channel></rss>"


def _public(_host: str) -> list[str]:
    return ["93.184.0.34"]


def test_private_addresses():
    for address in ("127.0.0.1", "10.1.2.3", "192.168.0.8", "172.16.5.1", "169.254.169.254", "::1"):
        assert is_private_address(address)
    assert not is_private_address("8.8.8.8")
    assert is_private_address("::ffff:127.0.0.1")


def test_blocks_before_any_request():
    called = False

    def opener(_url: str) -> HttpResult:
        nonlocal called
        called = True
        return HttpResult(200, {}, RSS)

    for url in (
        "http://127.0.0.1/feed",
        "http://10.0.0.8/feed",
        "http://localhost/feed",
        "http://169.254.169.254/latest/meta-data",
        "http://[::1]/feed",
        "https://metadata.google.internal/feed",
        "file:///etc/passwd",
        "https://user:secret@news.example/feed",
        "http://news.example:22/feed",
    ):
        try:
            assert_public_http_url(url, _public)
        except FeedError:
            pass
        else:
            raise AssertionError(url)
    assert called is False


def test_redirect_to_private_is_rejected():
    def opener(url: str) -> HttpResult:
        if url.startswith("https://news.example"):
            return HttpResult(302, {"location": "http://127.0.0.1/admin"}, b"")
        raise AssertionError(url)

    def resolver(host: str) -> list[str]:
        return ["127.0.0.1"] if host == "127.0.0.1" else ["93.184.0.34"]

    try:
        fetch_public("https://news.example/start", resolver=resolver, opener=opener)
    except FeedError as exc:
        assert "privada" in str(exc)
    else:
        raise AssertionError("redirect should fail")
