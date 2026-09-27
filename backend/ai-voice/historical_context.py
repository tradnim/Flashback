"""Time-gated adapter between the historical engine and AI-VOICE services.

The historical engine owns its endpoint and event schema. Callers inject a
fetcher that asks that engine for events unlocked at the supplied timestamp.
This module applies a second cutoff check and exposes only cited event facts.
"""

from __future__ import annotations

from datetime import date, datetime, time, timezone
from typing import Any, Callable, Iterable, Mapping
from urllib.parse import urlparse


class HistoricalContextError(ValueError):
    """Raised when the time-gated historical context cannot be trusted."""


EventFetcher = Callable[[str], Iterable[Mapping[str, Any]]]


def parse_timestamp(value: Any) -> datetime:
    """Parse an ISO timestamp and return UTC; reject ambiguous local times."""
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, date):
        parsed = datetime.combine(value, time.min, tzinfo=timezone.utc)
    elif isinstance(value, str):
        raw = value.strip()
        if not raw:
            raise HistoricalContextError("Timestamp is empty")
        if len(raw) == 10:
            try:
                return datetime.combine(date.fromisoformat(raw), time.min, tzinfo=timezone.utc)
            except ValueError as exc:
                raise HistoricalContextError("Timestamp is not a valid ISO date") from exc
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HistoricalContextError("Timestamp is not valid ISO-8601") from exc
    else:
        raise HistoricalContextError("Timestamp must be an ISO-8601 string")

    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise HistoricalContextError("Simulated time must include a timezone")
    return parsed.astimezone(timezone.utc)


def _first_value(record: Mapping[str, Any], names: tuple[str, ...]) -> Any:
    for name in names:
        value = record.get(name)
        if value is not None and value != "":
            return value
    return None


def _event_timestamp(event: Mapping[str, Any]) -> datetime | None:
    raw = _first_value(event, ("occurred_at", "timestamp", "date", "time"))
    if raw is None:
        return None
    try:
        return parse_timestamp(raw)
    except HistoricalContextError:
        return None


def _http_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    url = value.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    return url


def _event_sources(event: Mapping[str, Any]) -> list[dict[str, str]]:
    raw_sources = _first_value(event, ("sources", "citations"))
    if raw_sources is None:
        raw_sources = [event]
    elif isinstance(raw_sources, (str, Mapping)):
        raw_sources = [raw_sources]

    sources: list[dict[str, str]] = []
    seen: set[str] = set()
    for raw in raw_sources:
        if isinstance(raw, str):
            url = _http_url(raw)
            title = raw
        elif isinstance(raw, Mapping):
            url = _http_url(_first_value(raw, ("url", "source_url", "href")))
            title_value = _first_value(raw, ("title", "name", "label", "source"))
            title = str(title_value).strip() if title_value else "Historical source"
        else:
            continue
        if url and url not in seen:
            sources.append({"title": title, "url": url})
            seen.add(url)
    return sources


def load_unlocked_context(
    simulationTime: str | datetime,
    fetch_unlocked_events: EventFetcher,
) -> dict[str, Any]:
    """Fetch at the requested time and fail closed on future or uncited rows.

    ``fetch_unlocked_events`` must call the historical engine's time-filtered
    query, passing the exact UTC cutoff it receives. Its route remains an
    injected dependency until the shared API contract is agreed.
    """
    cutoff = parse_timestamp(simulationTime)
    cutoff_text = cutoff.isoformat().replace("+00:00", "Z")
    response = fetch_unlocked_events(cutoff_text)

    # Permit a simple engine response wrapper without coupling to its endpoint.
    if isinstance(response, Mapping):
        response = response.get("events", [])
    if not isinstance(response, Iterable) or isinstance(response, (str, bytes)):
        raise HistoricalContextError("Historical engine returned an invalid event collection")

    allowed: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for event in response:
        if not isinstance(event, Mapping):
            continue

        event_time = _event_timestamp(event)
        if event_time is None or event_time > cutoff:
            continue

        event_id_value = _first_value(event, ("event_id", "id", "_id"))
        title_value = _first_value(event, ("title", "name"))
        summary_value = _first_value(event, ("summary", "description", "details"))
        sources = _event_sources(event)
        event_id = str(event_id_value) if event_id_value is not None else ""
        if not event_id or event_id in seen_ids or not sources:
            continue
        if not isinstance(summary_value, str) or not summary_value.strip():
            continue

        allowed.append(
            {
                "event_id": event_id,
                "occurred_at": event_time.isoformat().replace("+00:00", "Z"),
                "title": str(title_value).strip() if title_value else "Historical event",
                "summary": summary_value.strip(),
                "sources": sources,
            }
        )
        seen_ids.add(event_id)

    allowed.sort(key=lambda event: parse_timestamp(event["occurred_at"]))

    return {"simulationTime": cutoff_text, "events": allowed}


def citations_for_events(
    events: Iterable[Mapping[str, Any]], event_ids: Iterable[Any]
) -> list[dict[str, Any]]:
    """Resolve model-selected IDs only to citations present in unlocked rows."""
    event_by_id = {str(event["event_id"]): event for event in events}
    citations: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw_id in event_ids:
        event_id = str(raw_id)
        event = event_by_id.get(event_id)
        if event is None or event_id in seen:
            continue
        citations.append(
            {
                "event_id": event_id,
                "title": event["title"],
                "occurred_at": event["occurred_at"],
                "sources": event["sources"],
            }
        )
        seen.add(event_id)
    return citations
