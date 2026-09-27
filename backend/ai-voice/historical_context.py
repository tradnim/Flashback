"""Time-gated adapter between James's HTTP historical engine and AI-VOICE."""

from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Iterable, Mapping
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen


class HistoricalContextError(ValueError):
    """Raised when the time-gated historical context cannot be trusted."""


EventFetcher = Callable[
    [str], Iterable[Mapping[str, Any]] | Mapping[str, Any]
]
DEFAULT_HISTORICAL_ENGINE_URL = "http://127.0.0.1:3000"


def parse_timestamp(value: Any) -> datetime:
    """Parse an ISO UTC timestamp; reject date-only, local, or non-UTC values."""
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        raw = value.strip()
        if not raw:
            raise HistoricalContextError("Timestamp is empty")
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HistoricalContextError("Timestamp is not valid ISO-8601") from exc
    else:
        raise HistoricalContextError("Timestamp must be an ISO-8601 string")

    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise HistoricalContextError("Simulated time must include a UTC timezone")
    if parsed.utcoffset() != timedelta(0):
        raise HistoricalContextError("Timestamp must use UTC")
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


def fetch_events_from_engine(simulationTime: str) -> list[Mapping[str, Any]]:
    """Fetch the requested time slice from James's Express service.

    James's current route uses ``GET /api/events?simulationTime=...`` and
    returns its event list under ``data``. The draft shared contract's
    ``events`` wrapper is accepted as well.
    """
    base_url = os.environ.get(
        "HISTORICAL_ENGINE_URL", DEFAULT_HISTORICAL_ENGINE_URL
    ).strip().rstrip("/")
    if not base_url:
        raise HistoricalContextError("HISTORICAL_ENGINE_URL cannot be empty")

    time_parameter = os.environ.get("HISTORICAL_ENGINE_TIME_PARAM", "simulationTime").strip()
    if time_parameter not in ("simulationTime", "time"):
        raise HistoricalContextError(
            "HISTORICAL_ENGINE_TIME_PARAM must be 'simulationTime' or 'time'"
        )
    query = urlencode({time_parameter: simulationTime})
    request = Request(
        f"{base_url}/api/events?{query}",
        headers={"Accept": "application/json"},
        method="GET",
    )
    try:
        with urlopen(request, timeout=10) as response:
            response_body = response.read()
    except HTTPError as exc:
        raise HistoricalContextError(
            f"Historical engine returned HTTP {exc.code}"
        ) from None
    except (URLError, TimeoutError):
        raise HistoricalContextError("Historical engine request could not be completed") from None

    try:
        envelope = json.loads(response_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise HistoricalContextError("Historical engine returned invalid JSON") from None
    if not isinstance(envelope, Mapping):
        raise HistoricalContextError("Historical engine returned an invalid response")
    if envelope.get("status") not in (None, "success"):
        raise HistoricalContextError("Historical engine returned an unsuccessful response")

    events = envelope.get("data", envelope.get("events"))
    if not isinstance(events, list):
        raise HistoricalContextError("Historical engine response is missing its event list")

    returned_clock = envelope.get("authoritativeClock", envelope.get("currentTime"))
    if returned_clock is not None:
        try:
            parsed_returned_clock = parse_timestamp(returned_clock)
            parsed_requested_clock = parse_timestamp(simulationTime)
        except HistoricalContextError:
            raise HistoricalContextError(
                "Historical engine returned an invalid simulation clock"
            ) from None
        if parsed_returned_clock > parsed_requested_clock:
            raise HistoricalContextError("Historical engine returned a later simulation clock")
    return events


def _http_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    url = value.strip()
    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return None
    return url


def _event_sources(event: Mapping[str, Any]) -> list[dict[str, Any]]:
    raw_sources = _first_value(event, ("sources", "citations"))
    if raw_sources is None:
        raw_sources = [event]
    elif isinstance(raw_sources, (str, Mapping)):
        raw_sources = [raw_sources]

    sources: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw in raw_sources:
        if isinstance(raw, str):
            url = _http_url(raw)
            source_name = raw
            reference_id = None
        elif isinstance(raw, Mapping):
            url = _http_url(_first_value(raw, ("url", "source_url", "href")))
            name_value = _first_value(
                raw, ("sourceName", "source_name", "label", "title", "name", "source")
            )
            reference_value = _first_value(
                raw, ("referenceId", "reference_id", "reference", "ref")
            )
            source_name = str(name_value).strip() if name_value else None
            reference_id = str(reference_value).strip() if reference_value else None
        else:
            continue
        if not (url or reference_id):
            continue
        identity = reference_id or url or source_name or ""
        if identity and identity not in seen:
            source = {"label": source_name or reference_id or "Historical source"}
            if reference_id:
                source["referenceId"] = reference_id
            if url:
                source["url"] = url
            sources.append(source)
            seen.add(identity)
    return sources


def load_unlocked_context(
    simulationTime: str | datetime,
    fetch_unlocked_events: EventFetcher,
) -> dict[str, Any]:
    """Fetch at the requested time and fail closed on future or uncited rows.

    ``fetch_unlocked_events`` receives the exact UTC cutoff. The HTTP wrapper
    supplies ``fetch_events_from_engine``, which calls James's time-filtered
    route and accepts both his current envelope and the draft contract envelope.
    """
    cutoff = parse_timestamp(simulationTime)
    cutoff_text = cutoff.isoformat().replace("+00:00", "Z")
    response = fetch_unlocked_events(cutoff_text)

    # Permit callers to pass either engine's event-list wrapper directly.
    if isinstance(response, Mapping):
        if response.get("status") not in (None, "success"):
            raise HistoricalContextError("Historical engine returned an unsuccessful response")
        if "data" in response:
            response = response["data"]
        elif "events" in response:
            response = response["events"]
        else:
            raise HistoricalContextError("Historical engine response is missing its event list")
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

        if event.get("isVerified", event.get("is_verified", True)) is False:
            continue

        event_id_value = _first_value(event, ("eventId", "event_id", "id", "_id"))
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
