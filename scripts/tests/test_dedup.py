from trendwatch_jobs.dedup import group_ids, pair_score, tokens


def test_same_auction_clusters_without_the_model():
    titles = [
        ("a", "Spain awards 3.5 GW in its latest onshore wind auction"),
        ("b", "Spanish wind auction clears 3.5 GW with tighter local-content rules"),
        ("c", "Iberian grid expects 3.5 GW from the new Spanish wind auction"),
        ("d", "Community fund buys a stake in a municipal solar garden"),
    ]
    groups = group_ids(titles, same_story=None)
    multi = [set(group) for group in groups if len(group) > 1]
    assert multi == [{"a", "b", "c"}]


def test_gray_zone_asks_the_model():
    titles = [
        ("a", "Spain battery storage pilot adds a small municipal trial"),
        ("b", "Spain opens a battery storage consultation with a long public comment period ahead"),
    ]
    score = pair_score(tokens(titles[0][1]), tokens(titles[1][1]))
    assert 0.34 <= score < 0.42

    asked: list[tuple[str, str]] = []

    def same_story(left: str, right: str) -> bool:
        asked.append((left, right))
        return "battery storage" in left.lower() and "battery storage" in right.lower()

    groups = group_ids(titles, same_story)
    assert asked
    assert {len(group) for group in groups} == {2}

    separate = group_ids(titles, lambda _left, _right: False)
    assert all(len(group) == 1 for group in separate)


def test_north_sea_headlines_cluster_by_overlap():
    titles = [
        ("a", "North Sea offshore lease round draws mixed bids"),
        ("b", "Offshore wind leasing in the North Sea sees cautious bidding"),
    ]
    groups = group_ids(titles, same_story=None)
    assert {len(group) for group in groups} == {2}


def test_battery_headlines_share_a_story():
    titles = [
        ("a", "Battery pack prices fall again as LFP capacity expands"),
        ("b", "LFP oversupply pushes utility-scale battery prices lower"),
        ("c", "Local football club adds a small rooftop array above the stands"),
    ]
    groups = group_ids(titles, same_story=None)
    multi = [set(group) for group in groups if len(group) > 1]
    assert multi == [{"a", "b"}]
