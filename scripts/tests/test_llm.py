from trendwatch_jobs.llm import FakeLLM, parse_brief, parse_classification, parse_json_object
from trendwatch_jobs.models import Topic


def test_parse_fenced_json_and_classification():
    payload = parse_json_object('```json\n{"topic_slug": "wind", "relevance": 3, "reason": "Subasta"}\n```')
    parsed = parse_classification(payload, {"wind", "solar"})
    assert parsed.topic_slug == "wind"
    assert parsed.relevance == 3
    unknown = parse_classification(
        {"topic_slug": "nope", "relevance": 0, "reason": "Nada"},
        {"wind"},
    )
    assert unknown.topic_slug is None


def test_fake_llm_uses_keywords_only():
    topics = [
        Topic("1", "s", "wind", "Eólica", "", ["wind", "auction"], True),
        Topic("2", "s", "solar", "Solar", "", ["solar"], True),
    ]
    llm = FakeLLM()
    result = llm.classify(
        title="Spanish wind auction clears 3.5 GW",
        summary="",
        sector="Energía renovable",
        topics=topics,
    )
    assert result.topic_slug == "wind"
    assert result.relevance == 2
    brief = parse_brief(
        {
            "title": "Semana",
            "trends": ["Una"],
            "opportunities": [],
            "alerts": [],
            "upcoming_events": [],
            "narrative": "Texto",
        }
    )
    assert brief.trends == ["Una"]
