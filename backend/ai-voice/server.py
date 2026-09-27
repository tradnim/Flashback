"""HTTP wrapper for the AI-VOICE services.

Run with ``python server.py``. The service exposes POST /api/ask and
POST /api/broadcast, and fetches time-filtered event records from James's
historical engine before invoking either AI provider.
"""

from __future__ import annotations

import json
import os
import re
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

try:  # Support package imports and running server.py directly.
    from .eleven import ElevenLabsError, generate_briefing
    from .gemini import GeminiError, answer_question
    from .historical_context import (
        HistoricalContextError,
        fetch_events_from_engine,
        parse_timestamp,
    )
except ImportError:  # pragma: no cover - import style depends on the app layout.
    from eleven import ElevenLabsError, generate_briefing
    from gemini import GeminiError, answer_question
    from historical_context import HistoricalContextError, fetch_events_from_engine, parse_timestamp


MAX_REQUEST_BYTES = 64 * 1024
MAX_CACHED_AUDIO_BYTES = 32 * 1024 * 1024
MAX_CACHED_AUDIO_ITEMS = 32
AUDIO_URL_TTL_SECONDS = 15 * 60
DEFAULT_ALLOWED_ORIGINS = (
    "http://localhost:5173,http://127.0.0.1:5173"
)


class InvalidRequest(ValueError):
    """Raised when a caller sends invalid JSON or request fields."""


class RequestTooLarge(InvalidRequest):
    """Raised when a request body exceeds the service limit."""


class AudioStore:
    """Hold recent MP3 responses in bounded memory for direct browser playback."""

    def __init__(self) -> None:
        self._entries: dict[str, tuple[bytes, float]] = {}
        self._size_bytes = 0
        self._lock = threading.Lock()

    def _remove(self, token: str) -> None:
        entry = self._entries.pop(token, None)
        if entry is not None:
            self._size_bytes -= len(entry[0])

    def _remove_expired(self, now: float) -> None:
        for token, (_, expires_at) in list(self._entries.items()):
            if expires_at <= now:
                self._remove(token)

    def put(self, audio: bytes) -> str:
        if not audio:
            raise ValueError("Audio payload cannot be empty")
        if len(audio) > MAX_CACHED_AUDIO_BYTES:
            raise ElevenLabsError("Generated audio is too large to serve")

        now = time.monotonic()
        with self._lock:
            self._remove_expired(now)
            while (
                self._entries
                and (
                    len(self._entries) >= MAX_CACHED_AUDIO_ITEMS
                    or self._size_bytes + len(audio) > MAX_CACHED_AUDIO_BYTES
                )
            ):
                self._remove(next(iter(self._entries)))

            token = secrets.token_urlsafe(24)
            self._entries[token] = (audio, now + AUDIO_URL_TTL_SECONDS)
            self._size_bytes += len(audio)
        return token

    def get(self, token: str) -> bytes | None:
        now = time.monotonic()
        with self._lock:
            self._remove_expired(now)
            entry = self._entries.get(token)
            return entry[0] if entry is not None else None


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

    def _send_audio(self, audio: bytes) -> None:
        total = len(audio)
        start = 0
        end = total - 1
        status = 200
        range_header = self.headers.get("Range")
        if range_header:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header.strip())
            if not match:
                self.send_response(416)
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Range", f"bytes */{total}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return

            first, last = match.groups()
            if not first:
                suffix_length = int(last or "0")
                if suffix_length <= 0:
                    start = total
                else:
                    start = max(0, total - suffix_length)
            else:
                start = int(first)
                end = int(last) if last else end

            if start >= total or end < start:
                self.send_response(416)
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Range", f"bytes */{total}")
                self.send_header("Content-Length", "0")
                self.end_headers()
                return
            end = min(end, total - 1)
            status = 206

        body = audio[start : end + 1]
        self.send_response(status)
        self.send_header("Content-Type", "audio/mpeg")
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Content-Disposition", "inline; filename=flashback-briefing.mp3")
        self.send_header("X-Content-Type-Options", "nosniff")
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{total}")
        self.end_headers()
        self.wfile.write(body)

    def _audio_url(self, token: str) -> str:
        configured_base = os.environ.get("AI_VOICE_PUBLIC_URL", "").strip().rstrip("/")
        if configured_base:
            parsed_base = urlsplit(configured_base)
            if (
                parsed_base.scheme not in ("http", "https")
                or not parsed_base.netloc
                or parsed_base.query
                or parsed_base.fragment
            ):
                raise RuntimeError(
                    "AI_VOICE_PUBLIC_URL must be an absolute HTTP(S) base URL"
                )
            base = configured_base
        else:
            origin = urlsplit(self.headers.get("Origin", ""))
            hostname = origin.hostname or "127.0.0.1"
            if ":" in hostname and not hostname.startswith("["):
                hostname = f"[{hostname}]"
            port = self.server.server_address[1]
            base = f"http://{hostname}:{port}"
        return f"{base}/api/audio/{token}"

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
        path = urlsplit(self.path).path
        audio_match = re.fullmatch(r"/api/audio/([A-Za-z0-9_-]{20,64})", path)
        if audio_match:
            audio = self.server.audio_store.get(audio_match.group(1))  # type: ignore[attr-defined]
            if audio is None:
                self._send_json(404, {"error": "AUDIO_NOT_FOUND"})
                return
            self._send_audio(audio)
            return
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
                        "known": answer["known"],
                        "sources": _source_response(answer.get("citations", [])),
                    },
                )
                return

            briefing = generate_briefing(simulationTime, fetch_events_from_engine)
            audio_token = self.server.audio_store.put(  # type: ignore[attr-defined]
                briefing["audio_bytes"]
            )
            self._send_json(
                200,
                {
                    "script": briefing["script"],
                    "audioUrl": self._audio_url(audio_token),
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
        except GeminiError as exc:
            if exc.status_code == 429:
                self._send_json(
                    503,
                    {
                        "error": "GEMINI_RATE_LIMITED",
                        "message": (
                            "Gemini on Agent Platform is rate limiting requests or has "
                            "limited capacity. Retry after a short delay."
                        ),
                    },
                )
            elif exc.status_code in (401, 403):
                self._send_json(
                    502,
                    {
                        "error": "GEMINI_PERMISSION_DENIED",
                        "message": (
                            "Gemini on Agent Platform rejected the local credentials "
                            "or project permissions."
                        ),
                    },
                )
            else:
                self._send_json(
                    502,
                    {
                        "error": "GEMINI_UNAVAILABLE",
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

    def __init__(self, server_address: Any, request_handler: Any) -> None:
        super().__init__(server_address, request_handler)
        self.allowed_origins = _allowed_origins()
        self.audio_store = AudioStore()


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
    print(f"AI-VOICE API listening on http://{host}:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
