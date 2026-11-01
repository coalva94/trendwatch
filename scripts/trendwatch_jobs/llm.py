from __future__ import annotations

import json
import urllib.request

from trendwatch_jobs.errors import LLMError
from trendwatch_jobs.models import Classification, Topic, WeeklyBrief


def parse_json_object(text: str) -> dict:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        cleaned = cleaned.removeprefix("json").strip()
    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise LLMError("La respuesta del modelo no es JSON") from exc
    if not isinstance(payload, dict):
        raise LLMError("La respuesta del modelo no es un objeto")
    return payload


def parse_classification(payload: dict, topic_slugs: set[str]) -> Classification:
    relevance = payload.get("relevance")
    if isinstance(relevance, bool) or not isinstance(relevance, int) or not 0 <= relevance <= 3:
        raise LLMError("relevance inválida")
    reason = str(payload.get("reason") or "").strip()
    if not reason:
        raise LLMError("falta reason")
    slug = payload.get("topic_slug")
    if slug is not None and slug not in topic_slugs:
        slug = None
    if relevance == 0:
        slug = None
    return Classification(relevance=relevance, reason=reason[:400], topic_slug=slug)


def _string_list(payload: dict, key: str) -> list[str]:
    value = payload.get(key, [])
    if not isinstance(value, list) or not all(isinstance(item, str) and item.strip() for item in value):
        raise LLMError(f"{key} debe ser una lista de textos")
    return [item.strip()[:400] for item in value[:6]]


def parse_brief(payload: dict) -> WeeklyBrief:
    title = str(payload.get("title") or "").strip()
    narrative = str(payload.get("narrative") or "").strip()
    if not title or not narrative:
        raise LLMError("el informe necesita título y narrativa")
    return WeeklyBrief(
        title=title[:180],
        trends=_string_list(payload, "trends"),
        opportunities=_string_list(payload, "opportunities"),
        alerts=_string_list(payload, "alerts"),
        upcoming_events=_string_list(payload, "upcoming_events"),
        narrative=narrative[:2000],
    )


class FakeLLM:
    """Keyword overlap stand-in. Tests and local dry runs never call a network."""

    def __init__(self, same_story_result: bool = False) -> None:
        self.same_story_result = same_story_result
        self.same_story_calls: list[tuple[str, str]] = []

    def classify(self, *, title: str, summary: str, sector: str, topics: list[Topic]) -> Classification:
        del sector
        text = f"{title} {summary}".lower()
        best: Topic | None = None
        hits = 0
        for topic in topics:
            count = sum(1 for keyword in topic.keywords if keyword.lower() in text)
            if count > hits:
                hits = count
                best = topic
        relevance = min(3, hits)
        if relevance == 0 or best is None:
            return Classification(0, "Sin solape con los temas del sector.", None)
        return Classification(relevance, f"Coincide con {best.name} ({hits}).", best.slug)

    def same_story(self, title_a: str, title_b: str) -> bool:
        self.same_story_calls.append((title_a, title_b))
        return self.same_story_result

    def weekly_brief(self, *, sector: str, items: list[dict]) -> WeeklyBrief:
        titles = [str(item["title"]) for item in items[:3]]
        return WeeklyBrief(
            title=f"Semana de {sector}",
            trends=titles or ["Sin señales claras."],
            opportunities=[],
            alerts=[],
            upcoming_events=[],
            narrative="Resumen de prueba construido con los titulares de la semana.",
        )


def classification_prompt(*, title: str, summary: str, sector: str, topics: list[Topic]) -> str:
    catalog = "\n".join(f"- {topic.slug}: {topic.name}. {topic.description}" for topic in topics)
    return (
        "Clasifica un titular de vigilancia de mercado. "
        "Responde solo JSON con topic_slug (slug de la lista o null), relevance (entero 0-3) "
        "y reason (una frase en español). "
        "0 no relacionado, 1 tangencial, 2 relevante, 3 señal prioritaria. "
        "No inventes hechos que no estén en el titular.\n"
        f"Sector: {sector}\nTemas:\n{catalog}\n"
        f"Titular: {title}\nExtracto: {summary}"
    )


def brief_prompt(*, sector: str, items: list[dict]) -> str:
    lines = [
        f"- {item['title']} | relevancia {item.get('relevance')} | {item.get('summary', '')}"
        for item in items[:40]
    ]
    joined = "\n".join(lines)
    return (
        "Redacta el informe semanal de vigilancia. Responde solo JSON con title, trends, "
        "opportunities, alerts, upcoming_events (listas de frases en español) y narrative. "
        "No borres ni recomiendes operaciones. Si falta evidencia, dilo.\n"
        f"Sector: {sector}\nNoticias:\n{joined}"
    )


class GeminiClient:
    def __init__(self, api_key: str, model: str, transport=None) -> None:
        self.api_key = api_key
        self.model = model
        self.transport = transport or gemini_transport

    def classify(self, *, title: str, summary: str, sector: str, topics: list[Topic]) -> Classification:
        prompt = classification_prompt(title=title, summary=summary, sector=sector, topics=topics)
        payload = parse_json_object(self.transport(self.api_key, self.model, prompt))
        return parse_classification(payload, {topic.slug for topic in topics})

    def same_story(self, title_a: str, title_b: str) -> bool:
        prompt = (
            "¿Estos dos titulares cuentan la misma noticia? "
            'Responde solo JSON {"same": true} o {"same": false}.\n'
            f"A: {title_a}\nB: {title_b}"
        )
        payload = parse_json_object(self.transport(self.api_key, self.model, prompt))
        return payload.get("same") is True

    def weekly_brief(self, *, sector: str, items: list[dict]) -> WeeklyBrief:
        prompt = brief_prompt(sector=sector, items=items)
        payload = parse_json_object(self.transport(self.api_key, self.model, prompt))
        return parse_brief(payload)


def gemini_transport(api_key: str, model: str, prompt: str) -> str:
    if not model.replace(".", "").replace("-", "").isalnum():
        raise LLMError("Modelo no válido")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=40) as response:
            data = json.loads(response.read().decode())
    except Exception as exc:  # noqa: BLE001 - surface a stable error without the key
        raise LLMError("Gemini no respondió") from exc
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMError("Gemini devolvió una forma inesperada") from exc
