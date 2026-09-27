# Flashback API contract

All request bodies/query strings use `simulationTime`, a UTC ISO timestamp such as `1986-04-26T01:23:40Z`. Invalid or missing input returns 400, never a default to now. The frontend emits UTC Z timestamps.

## Events — port 3000

`GET /api/events?simulationTime=1986-04-25T23:45:00Z`

```json
{
  "status": "success",
  "authoritativeClock": "1986-04-25T23:45:00.000Z",
  "count": 1,
  "data": [{
    "eventId": "example-record",
    "title": "Recorded update",
    "description": "Information available at this time.",
    "timestamp": "1986-04-25T14:00:00.000Z",
    "category": "OPERATIONAL",
    "importance": "High",
    "isVerified": true,
    "citations": [{"sourceName": "Archive", "referenceId": "Record 1"}]
  }]
}
```

Illustrative payload, not a factual dataset entry. Records sort ascending and satisfy `timestamp <= simulationTime` and `isVerified: true`. Citations may include an HTTP(S) `url`. Database failures return 503 `DATABASE_UNAVAILABLE`; invalid input returns 400 `INVALID_SIMULATION_TIME`. The existing `authoritativeClock` response field is preserved.

## Questions — port 8000

`POST /api/ask`:

```json
{"question":"What is known?","simulationTime":"1986-04-25T23:45:00Z"}
```

Response: `{"answer":"...","known":true,"sources":[{"label":"Archive","referenceId":"Record 1","eventId":"example-record","eventTitle":"Recorded update"}]}`.

Questions must be nonempty and at most 4,000 characters. AI retrieves from the engine and independently excludes future, unverified, uncited, malformed and duplicate records. Citation IDs must resolve to unlocked records. Source URLs are optional. Context filtering reduces spoilers; a prompt and citation ID checks alone do not guarantee the model's factual fidelity.

## Briefings and audio — port 8000

`POST /api/broadcast`:

```json
{"simulationTime":"1986-04-25T23:45:00Z"}
```

Response: `{"script":"...","audioUrl":"/api/audio/<token>"}`.

Default playback URL is same-origin through Vite. `AI_VOICE_PUBLIC_URL` overrides its HTTP(S) base. The frontend accepts relative paths, HTTP(S), and base64 `data:audio/<mime>;base64,...`. Other protocols/data types are rejected. The current backend returns in-memory MP3 playback URLs, not embedded data URLs.

`GET /api/audio/<token>` returns 200 or 206 for a valid single byte range, and 416 for invalid ranges. Tokens expire after 15 minutes, can be evicted sooner and are lost on restart. Missing/expired tokens return 404 `AUDIO_NOT_FOUND`; regenerate to recover. Playback is user-initiated.

## Health, routing and errors

Both services: `GET /health` for liveness. Engine `GET /ready` pings MongoDB. AI `GET /ready` checks the engine and local provider configuration without paid calls. 200 means these checks passed; 503 indicates an unavailable dependency/configuration. `authenticationVerified: false` means readiness has not exercised provider authentication.

Frontend routing: `/api/events` → 3000; `/api/ask`, `/api/broadcast`, `/api/audio` → 8000. `/api/history/health|ready` and `/api/ai/health|ready` map to service health paths.

AI errors contain `error` and an optional safe `message`: `INVALID_REQUEST` (400), `REQUEST_TOO_LARGE` (413), `ORIGIN_NOT_ALLOWED` (403), `HISTORICAL_ENGINE_UNAVAILABLE` (502), `GEMINI_NOT_CONFIGURED`/`ELEVENLABS_NOT_CONFIGURED` (503), `GEMINI_RATE_LIMITED` (503), `GEMINI_PERMISSION_DENIED`/`GEMINI_UNAVAILABLE`/`ELEVENLABS_UNAVAILABLE` (502). Never expose credential-bearing provider error details.

Offline demo is explicitly selected, never an automatic error fallback. Live failures retain the last successful timeline; timeline, question and audio errors are displayed separately.
