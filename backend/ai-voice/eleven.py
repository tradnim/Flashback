"""Create a time-gated radio script and synthesize it with ElevenLabs."""

from __future__ import annotations

import base64
import json
import os
from datetime import datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

try:  # Support both package imports and this folder on PYTHONPATH.
    from .historical_context import (
        EventFetcher,
        citations_for_events,
        load_unlocked_context,
        parse_timestamp,
    )
except ImportError:  # pragma: no cover - import style depends on the app layout.
    from historical_context import EventFetcher, citations_for_events, load_unlocked_context, parse_timestamp


class ElevenLabsError(RuntimeError):
    """Raised for missing credentials or an unusable ElevenLabs response."""


def build_radio_script(context: dict[str, Any]) -> tuple[str, list[str]]:
    """Build speech only from the facts in the already-filtered event context."""
    simulationTime = context["simulationTime"]
    events = context["events"]
    if not events:
        return (
            "Flashback briefing. No cited events are available in the unlocked "
            f"historical context as of {simulationTime}, so there are no sourced "
            "event details to brief.",
            [],
        )

    lines = [f"Flashback briefing, based on the unlocked record as of {simulationTime}."]
    included_ids: list[str] = []
    for event in events:
        spoken_time = parse_timestamp(event["occurred_at"]).strftime("%B %d, %Y at %H:%M UTC")
        lines.append(
            f"At {spoken_time}: {event['title']}. {event['summary']}"
        )
        included_ids.append(event["event_id"])
    lines.append("End of briefing.")
    return " ".join(lines), included_ids


def _synthesize_speech(script: str) -> bytes:
    api_key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    if not api_key:
        raise ElevenLabsError("ELEVENLABS_API_KEY is not configured")
    voice_id = os.environ.get("ELEVENLABS_VOICE_ID", "").strip()
    if not voice_id:
        raise ElevenLabsError("ELEVENLABS_VOICE_ID is not configured")

    model_id = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_multilingual_v2").strip()
    if not model_id:
        raise ElevenLabsError("ELEVENLABS_MODEL_ID cannot be empty")

    endpoint = (
        "https://api.elevenlabs.io/v1/text-to-speech/"
        f"{quote(voice_id, safe='')}?output_format=mp3_44100_128"
    )
    payload = {
        "text": script,
        "model_id": model_id,
    }
    request = Request(
        endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
            "xi-api-key": api_key,
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            audio = response.read()
    except HTTPError as exc:
        raise ElevenLabsError(f"ElevenLabs request failed with HTTP {exc.code}") from None
    except (URLError, TimeoutError):
        raise ElevenLabsError("ElevenLabs request could not be completed") from None
    if not audio:
        raise ElevenLabsError("ElevenLabs returned an empty audio response")
    return audio


def generate_briefing(
    simulationTime: str | datetime,
    fetch_unlocked_events: EventFetcher,
) -> dict[str, Any]:
    """Return an MP3 briefing synthesized from historical-engine context.

    The result includes a self-contained data URL playable as an audio source.
    """
    context = load_unlocked_context(simulationTime, fetch_unlocked_events)
    script, cited_ids = build_radio_script(context)
    audio = _synthesize_speech(script)
    return {
        "simulationTime": context["simulationTime"],
        "script": script,
        "audio_url": f"data:audio/mpeg;base64,{base64.b64encode(audio).decode('ascii')}",
        "content_type": "audio/mpeg",
        "format": "mp3",
        "citations": citations_for_events(context["events"], cited_ids),
    }
