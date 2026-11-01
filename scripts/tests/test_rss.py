from trendwatch_jobs.rss import parse_feed

SAMPLE = """<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Spain awards 3.5 GW</title>
      <link>https://news.example/a</link>
      <guid>a-1</guid>
      <pubDate>Mon, 27 Oct 2026 09:00:00 GMT</pubDate>
      <description>Extracto &lt;b&gt;breve&lt;/b&gt;</description>
    </item>
  </channel>
</rss>
"""

ATOM = """<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Battery prices</title>
    <id>urn:battery</id>
    <updated>2026-10-28T10:00:00Z</updated>
    <link rel="alternate" href="https://news.example/b"/>
    <summary>Pack LFP</summary>
  </entry>
</feed>
"""


def test_parse_rss_and_atom():
    rss = parse_feed(SAMPLE)
    assert rss[0].external_id == "a-1"
    assert rss[0].published_at == "2026-10-27T09:00:00Z"
    assert "breve" in rss[0].summary
    assert "<" not in rss[0].summary

    atom = parse_feed(ATOM)
    assert atom[0].external_id == "urn:battery"
    assert atom[0].url == "https://news.example/b"
    assert atom[0].published_at == "2026-10-28T10:00:00Z"
