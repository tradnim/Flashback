# Noriel — AI + Voice

Python HTTP service for time-gated historian answers and spoken briefings. It fetches events from James's historical engine before calling OpenRouter or ElevenLabs; `historical_context.py` then applies a second cutoff and keeps only verified, cited records.

## Run locally

Use Python 3.10 or newer. From this folder, run:

```powershell
python server.py
```

The service listens on `http://127.0.0.1:8000` by default. The historical engine defaults to `http://127.0.0.1:3000` and must be running separately.

## HTTP routes

`POST /api/ask`

```json
{"question":"What was known?","simulationTime":"1986-04-26T00:00:00Z"}
```

The request may use the contract's `historicalTime` instead of `simulationTime`. If both are present, they must represent the same instant. The response is `{ "answer": "...", "sources": [...] }`.

`POST /api/broadcast`

```json
{"simulationTime":"1986-04-26T00:00:00Z"}
```

The response is `{ "script": "...", "audioUrl": "..." }`. `audioUrl` is currently a playable `data:audio/mpeg;base64,...` URL, so the audio is embedded in the JSON response rather than hosted as a separate file.

Timestamps must include a timezone, such as the UTC `Z` suffix shown above. The service rejects invalid timestamps with HTTP 400.

## Configuration

Set these values in the process environment or in this folder's ignored `.env` file. Process environment values take precedence.

- `OPENROUTER_API_KEY` (required), `OPENROUTER_MODEL` (defaults to `qwen/qwen3.8-27b:free`)
- `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (required for audio), `ELEVENLABS_MODEL_ID` (defaults to `eleven_multilingual_v2`)
- `HISTORICAL_ENGINE_URL` (defaults to `http://127.0.0.1:3000`)
- `HISTORICAL_ENGINE_TIME_PARAM` (defaults to James's current `simulationTime`; use `time` if the engine adopts the draft contract's query parameter)
- `AI_VOICE_HOST` (defaults to `127.0.0.1`), `AI_VOICE_PORT` (defaults to `8000`)
- `AI_VOICE_ALLOWED_ORIGINS` (comma-separated; defaults to localhost and 127.0.0.1 on Vite's port 5173)

Never commit `.env` or API keys.
