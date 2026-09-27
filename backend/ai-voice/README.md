# Noriel — AI + Voice

Python 3.10+ service: http://127.0.0.1:8000. This is not MongoDB. Events come from `HISTORICAL_ENGINE_URL=http://127.0.0.1:3000`.

```powershell
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt
# Copy .env.example to .env only if absent; configure privately.
.venv/Scripts/python.exe server.py
.venv/Scripts/python.exe -m unittest -v test_integration
```

Use `.venv/bin/python` on macOS/Linux. Local `.env` loading preserves existing process environment. Keep secrets out of the frontend and Git.

Gemini requires `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` (global), `GEMINI_MODEL` and Google Application Default Credentials. Use `gcloud auth application-default login` or `GOOGLE_APPLICATION_CREDENTIALS` pointing to a private file. Pinned SDK 2.25.0 supports `enterprise=True`; real model permissions still require a live test. See the [official SDK](https://github.com/googleapis/python-genai).

ElevenLabs requires `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`; model defaults to eleven_multilingual_v2. Blank `AI_VOICE_PUBLIC_URL` returns same-origin audio URLs. Local browser origins are localhost/127.0.0.1 port 5173; adjust `AI_VOICE_ALLOWED_ORIGINS` for other clients.

`/health` is liveness. `/ready` checks engine readiness and local provider settings without paid requests, not tokens/quotas/model permissions. Missing provider settings produce specific 503 responses.

`POST /api/ask`: `{"question":"What is known?","simulationTime":"1986-04-25T23:45:00Z"}`.

`POST /api/broadcast`: `{"simulationTime":"1986-04-25T23:45:00Z"}`.

Both paths filter timestamps, explicit verification and citations again. Gemini sees only filtered records. Briefings use a deterministic script and ElevenLabs speech. Audio lives for up to 15 minutes in bounded memory, supports seeking and disappears on restart.

Tests use real local HTTP with controlled provider fixtures; they do not spend credits or verify live provider credentials. Consult the shared API contract and root README.
