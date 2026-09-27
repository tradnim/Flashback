# AI-VOICE

Python HTTP service for Flashback's time-gated historian answers and spoken
briefings. It asks the historical engine for events at the requested
`simulationTime`, applies a second cutoff, and passes only verified, cited,
unlocked records to OpenRouter or the deterministic briefing script. ElevenLabs
speaks that script; it does not create or add historical facts.

## Run locally

Use Python 3.10 or newer. Start James's historical engine first, then start
AI-VOICE from this folder:

```powershell
python server.py
```

By default, AI-VOICE listens at `http://127.0.0.1:8000` and the historical
engine is expected at `http://127.0.0.1:3000`. The frontend's Vite server
proxies `/api/ask` and `/api/broadcast` to AI-VOICE.

## HTTP API

All request times must be timezone-aware UTC ISO-8601 values. `Z` is the
recommended suffix. Invalid, missing, local-time, or non-UTC values receive
HTTP 400.

### `POST /api/ask`

Request:

```json
{
  "question": "What was known about the reactor at this time?",
  "simulationTime": "1986-04-26T00:00:00Z"
}
```

`historicalTime` is also accepted for the shared contract. If both time fields
are supplied, they must represent the same instant. The service returns the
model's known status and only citations resolved to unlocked historical
records:

```json
{
  "answer": "The unlocked record reports ...",
  "known": true,
  "sources": [
    {
      "label": "Source name",
      "url": "https://example.org/source",
      "eventId": "CHER-1986-0426-01",
      "eventTitle": "Event title"
    }
  ]
}
```

When the record does not establish the outcome, `known` is `false`. Answers
must not use information outside the unlocked event records. Source URLs may
be omitted when the historical engine provides only a reference ID.

### `POST /api/broadcast`

Request:

```json
{"simulationTime":"1986-04-26T00:00:00Z"}
```

Response:

```json
{
  "script": "Flashback briefing, based on the unlocked record ...",
  "audioUrl": "http://127.0.0.1:8000/api/audio/<temporary-id>"
}
```

The generated MP3 is served by `GET /api/audio/<temporary-id>`. Audio bytes
stay in bounded memory (up to 32 clips and 32 MB), support HTTP byte-range
requests for playback seeking, and expire after 15 minutes. Expired entries are
purged on the next cache access; the URL then returns HTTP 404. The service
does not write audio to disk or embed base64 audio in the JSON response.

**Integration note:** the current shared `API_CONTRACT.md` describes `audioUrl`
as an embedded `data:audio/mpeg` URL. AI-VOICE now returns an HTTP URL because
the current web player accepts only HTTP(S). Chris should align that contract
description before the integration is considered complete.

## Configuration

Set values in the process environment or this folder's ignored `.env` file.
Process environment values take precedence. Copy `.env.example` to `.env` and
fill in credentials locally; never commit `.env` or share its values.

- `OPENROUTER_API_KEY` (required for answers)
- `OPENROUTER_MODEL` (defaults to `qwen/qwen3.8-27b:free`)
- `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` (required for audio)
- `ELEVENLABS_MODEL_ID` (defaults to `eleven_multilingual_v2`)
- `HISTORICAL_ENGINE_URL` (defaults to `http://127.0.0.1:3000`)
- `HISTORICAL_ENGINE_TIME_PARAM` (defaults to `simulationTime`; set to `time`
  only if the engine route changes its query parameter)
- `AI_VOICE_HOST` and `AI_VOICE_PORT` (defaults to `127.0.0.1` and `8000`)
- `AI_VOICE_ALLOWED_ORIGINS` (comma-separated; defaults to the two local Vite
  origins)
- `AI_VOICE_PUBLIC_URL` (optional browser-reachable base URL for audio; when
  empty, AI-VOICE uses the request origin's hostname and its listening port)

For playback from another device using Vite's network link, set
`AI_VOICE_HOST=0.0.0.0`, add the exact frontend network origin to
`AI_VOICE_ALLOWED_ORIGINS`, and set `AI_VOICE_PUBLIC_URL` to
`http://<computer-LAN-IP>:8000`. The computer's firewall must allow that port.
For an HTTPS-hosted frontend, set `AI_VOICE_PUBLIC_URL` to the HTTPS URL of the
public audio route to avoid mixed-content blocking.

## Troubleshooting

- `HISTORICAL_ENGINE_UNAVAILABLE`: check that the Node service is running and
  that `HISTORICAL_ENGINE_URL` points to it.
- `OPENROUTER_UNAVAILABLE`: check the local key, model setting, and AI-VOICE
  terminal output. API credentials are never included in error responses.
- `OPENROUTER_RATE_LIMITED`: OpenRouter or the selected provider rejected the
  request for rate-limit/capacity reasons. Check the OpenRouter activity and
  usage pages, then retry after the limit clears.
- `ELEVENLABS_UNAVAILABLE`: check the local key and voice ID.
- `AUDIO_NOT_FOUND`: generated audio URLs are temporary and expire after 15
  minutes; request a new briefing.
- The frontend has an offline demo fallback. If it appears, inspect the
  browser's Network panel and the relevant backend terminal to see the API
  response that triggered it.
