"""HTTP wrapper for the AI-VOICE services.

Run with ``python server.py``. The service exposes POST /api/ask and
POST /api/broadcast, and fetches time-filtered event records from James's
historical engine before invoking either AI provider.
"""

from __future__ import annotations

import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

try:  # Support package imports and running server.py directly.
    from .eleven import ElevenLabsError, generate_briefing
    from .openrouter import OpenRouterError, answer_question
    from .historical_context import (
        HistoricalContextError,
        fetch_events_from_engine,
        parse_timestamp,
    )
except ImportError:  # pragma: no cover - import style depends on the app layout.
    from eleven import ElevenLabsError, generate_briefing
    from openrouter import OpenRouterError, answer_question
    from historical_context import HistoricalContextError, fetch_events_from_engine, parse_timestamp


MAX_REQUEST_BYTES = 64 * 1024
DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173"
)


class InvalidRequest(ValueError):
    """Raised when a caller sends invalid JSON or request fields."""


class RequestTooLarge(InvalidRequest):
    """Raised when a request body exceeds the service limit."""


def _canonical_simulation_time(body: dict[str, Any]) -> str:
    """Accept the shared draft's historicalTime and prefer simulationTime."""
    raw_values = [
        body.get(field)
        for field in ("simulationTime", "historicalTime")
        if body.get(field) not in (None, "")
    ]
    if not raw_values:
        raise InvalidRequest("simulationTime or historicalTime is required")

    try:
        parsed_values = [parse_timestamp(value) for value in raw_values]
    except HistoricalContextError:
        raise InvalidRequest(
            "simulationTime or historicalTime must be a timezone-aware ISO-8601 timestamp"
        ) from None
    if any(value != parsed_values[0] for value in parsed_values[1:]):
        raise InvalidRequest("simulationTime and historicalTime must match")
    return parsed_values[0].isoformat().replace("+00:00", "Z")


def _source_response(citations: Any) -> list[dict[str, Any]]:
    """Flatten event citations into the shared API's source list."""
    if not isinstance(citations, list):
        return []

    sources: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str]] = set()
    for citation in citations:
        if not isinstance(citation, dict):
            continue
        event_id = str(citation.get("event_id", ""))
        event_title = citation.get("title")
        nested_sources = citation.get("sources", [])
        if not isinstance(nested_sources, list):
            continue
        for source in nested_sources:
            if not isinstance(source, dict):
                continue
            label = source.get("label") or source.get("title") or "Historical source"
            reference_id = source.get("referenceId") or source.get("reference_id")
            url = source.get("url")
            identity = (event_id, str(reference_id or ""), str(url or label))
            if identity in seen:
                continue
            item: dict[str, Any] = {"label": str(label)}
            if url:
                item["url"] = url
            if reference_id:
                item["referenceId"] = reference_id
            if event_id:
                item["eventId"] = event_id
            if event_title:
                item["eventTitle"] = event_title
            sources.append(item)
            seen.add(identity)
    return sources


def _allowed_origins() -> set[str]:
    configured = os.environ.get("AI_VOICE_ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS)
    return {origin.strip() for origin in configured.split(",") if origin.strip()}


def _load_local_env() -> None:
    """Load simple KEY=VALUE entries without overriding process environment."""
    env_path = Path(__file__).resolve().with_name(".env")
    try:
        lines = env_path.read_text(encoding="utf-8-sig").splitlines()
    except FileNotFoundError:
        return

    for line in lines:
        entry = line.strip()
        if not entry or entry.startswith("#"):
            continue
        if entry.startswith("export "):
            entry = entry[7:].lstrip()
        key, separator, value = entry.partition("=")
        key = key.strip()
        if not separator or not key or not key.isidentifier() or key in os.environ:
            continue
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        os.environ[key] = value


class AIVoiceHandler(BaseHTTPRequestHandler):
    server_version = "FlashbackAIVoice/1.0"

    @property
    def allowed_origins(self) -> set[str]:
        return self.server.allowed_origins  # type: ignore[attr-defined]

    def end_headers(self) -> None:
        origin = self.headers.get("Origin")
        if origin and origin in self.allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict[str, Any]:
        raw_length = self.headers.get("Content-Length")
        if raw_length is None:
            raise InvalidRequest("Content-Length is required")
        try:
            length = int(raw_length)
        except ValueError:
            raise InvalidRequest("Content-Length is invalid") from None
        if length < 0:
            raise InvalidRequest("Content-Length is invalid")
        if length > MAX_REQUEST_BYTES:
            raise RequestTooLarge("Request body is too large")
        try:
            value = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise InvalidRequest("Request body must be valid JSON") from None
        if not isinstance(value, dict):
            raise InvalidRequest("Request body must be a JSON object")
        return value

    def _reject_unlisted_origin(self) -> bool:
        origin = self.headers.get("Origin")
        if origin and origin not in self.allowed_origins:
            self._send_json(403, {"error": "ORIGIN_NOT_ALLOWED"})
            return True
        return False

    def do_OPTIONS(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API name.
        if self._reject_unlisted_origin():
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API name.
        self._send_json(404, {"error": "NOT_FOUND"})

    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API name.
        path = urlsplit(self.path).path
        if path not in ("/api/ask", "/api/broadcast"):
            self._send_json(404, {"error": "NOT_FOUND"})
            return
        if self._reject_unlisted_origin():
            return

        try:
            body = self._read_json()
            simulationTime = _canonical_simulation_time(body)
            if path == "/api/ask":
                question = body.get("question")
                if not isinstance(question, str) or not question.strip():
                    raise InvalidRequest("question is required")
                if len(question) > 4000:
                    raise InvalidRequest("question must be 4000 characters or fewer")
                answer = answer_question(
                    question,
                    simulationTime,
                    fetch_events_from_engine,
                )
                self._send_json(
                    200,
                    {
                        "answer": answer["answer"],
                        "sources": _source_response(answer.get("citations", [])),
                    },
                )
                return

            briefing = generate_briefing(simulationTime, fetch_events_from_engine)
            self._send_json(
                200,
                {
                    "script": briefing["script"],
                    "audioUrl": briefing["audio_url"],
                },
            )
        except RequestTooLarge as exc:
            self._send_json(413, {"error": "REQUEST_TOO_LARGE", "message": str(exc)})
        except InvalidRequest as exc:
            self._send_json(400, {"error": "INVALID_REQUEST", "message": str(exc)})
        except HistoricalContextError:
            self._send_json(
                502,
                {
                    "error": "HISTORICAL_ENGINE_UNAVAILABLE",
                    "message": "Could not retrieve unlocked historical events.",
                },
            )
        except OpenRouterError:
            self._send_json(
                502,
                {
                    "error": "OPENROUTER_UNAVAILABLE",
                    "message": "Could not generate an answer.",
                },
            )
        except ElevenLabsError:
            self._send_json(
                502,
                {"error": "ELEVENLABS_UNAVAILABLE", "message": "Could not generate audio."},
            )
        except Exception:
            self._send_json(500, {"error": "INTERNAL_SERVER_ERROR"})


class AIVoiceServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main() -> None:
    _load_local_env()
    host = os.environ.get("AI_VOICE_HOST", "127.0.0.1").strip() or "127.0.0.1"
    try:
        port = int(os.environ.get("AI_VOICE_PORT", "8000"))
    except ValueError:
        raise SystemExit("AI_VOICE_PORT must be a number") from None
    if not 1 <= port <= 65535:
        raise SystemExit("AI_VOICE_PORT must be between 1 and 65535")

    server = AIVoiceServer((host, port), AIVoiceHandler)
    server.allowed_origins = _allowed_origins()  # type: ignore[attr-defined]
    print(f"AI-VOICE API listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
