# Flashback

Chernobyl timeline, simulation clock, questions and audio briefings. All requests use `simulationTime` in UTC. Only verified records at or before the clock are unlocked.

## Team folders

| Owner | Folder | Responsibility |
| --- | --- | --- |
| Mario | frontend/ | Responsive UI, clock, timeline, controls |
| James | backend/historical-engine/ | Data, verification, MongoDB queries |
| Noriel | backend/ai-voice/ | Gemini, citations, ElevenLabs |
| Chris | integration-infra/ | Shared configuration, startup, integration tests |

## First-time setup

Use Node.js 22+ (24 recommended), npm and Python 3.10+. From the repository root in PowerShell:

```powershell
npm --prefix frontend ci
npm --prefix backend/historical-engine ci
python -m venv backend/ai-voice/.venv
backend/ai-voice/.venv/Scripts/python.exe -m pip install -r backend/ai-voice/requirements.txt
if (-not (Test-Path backend/historical-engine/.env)) {
  Copy-Item backend/historical-engine/.env.example backend/historical-engine/.env
}
if (-not (Test-Path backend/ai-voice/.env)) {
  Copy-Item backend/ai-voice/.env.example backend/ai-voice/.env
}
```

On macOS/Linux use `.venv/bin/python`. The startup command detects either layout; `PYTHON` can override the executable.

Privately set `MONGO_URI` in the engine's ignored `.env` to the team's Atlas driver URI. The engine selects `chernobyl_simulation`; there is no local MongoDB fallback. Never put passwords in frontend settings, chat or Git.

In the AI `.env`, set `GOOGLE_CLOUD_PROJECT`, `GEMINI_MODEL`, `GOOGLE_CLOUD_LOCATION`, `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`. Use Google Application Default Credentials (`gcloud auth application-default login`) or a private `GOOGLE_APPLICATION_CREDENTIALS` file. Leave `AI_VOICE_PUBLIC_URL` blank for same-origin audio.

Initialize missing events, then start:

```powershell
npm --prefix backend/historical-engine run seed
node integration-infra/start.mjs
```

Open **http://127.0.0.1:5173**. Ctrl+C stops services launched by this command. Stop existing dev servers first: occupied ports cause a clear failure instead of killing another process. The engine must connect before AI and frontend start. Missing provider configuration is reported but does not block live events. Startup never seeds.

| Service | URL | Dependency |
| --- | --- | --- |
| Frontend | http://127.0.0.1:5173 | Proxies API requests |
| History engine | http://127.0.0.1:3000 | MongoDB Atlas |
| AI/voice | http://127.0.0.1:8000 | Engine, Gemini, ElevenLabs |

MongoDB is not port 8000. Each teammate runs their own services against the same Atlas database. Only the engine receives database credentials.

## Atlas setup — Chris

Use the existing team cluster if available. Otherwise create a free cluster in the team account, choosing an available US East region. Give the database user `readWrite` only on `chernobyl_simulation`. Add each teammate's current public IP to the IP access list; do not enable unrestricted `0.0.0.0/0`. Copy the Drivers URI, percent-encoding special password characters. See [Atlas connection requirements](https://www.mongodb.com/docs/atlas/driver-connection/).

A working URI does not prove tier, region, role scope or IP-list settings; check those in the Atlas console. Rotate passwords exposed in chat and update private local files.

## Offline demo

Run `npm --prefix frontend run dev` alone and select **Offline demo**. It uses sample events and text, not Gemini or generated audio. With demo unchecked, failures show independent errors and retain the last successful live timeline.

## Checks and troubleshooting

```powershell
npm --prefix backend/historical-engine run check:db
# Inserts missing IDs, seeds again and checks unchanged records/counts:
npm --prefix backend/historical-engine run check:db -- --verify-seed
Invoke-RestMethod http://127.0.0.1:3000/health
Invoke-RestMethod http://127.0.0.1:3000/ready
Invoke-RestMethod http://127.0.0.1:8000/ready
Invoke-RestMethod 'http://127.0.0.1:5173/api/events?simulationTime=1986-04-25T23:45:00Z'
npm --prefix frontend test
npm --prefix backend/historical-engine test
backend/ai-voice/.venv/Scripts/python.exe -m unittest discover -s backend/ai-voice -p 'test_*.py' -v
# Include the temporary Vite proxy / AI / audio integration test:
$env:RUN_PROXY_TESTS='1'
backend/ai-voice/.venv/Scripts/python.exe -m unittest discover -s backend/ai-voice -p 'test_*.py' -v
Remove-Item Env:RUN_PROXY_TESTS
npm --prefix frontend run build
```

`/health` means the process is running. Engine `/ready` pings MongoDB. AI `/ready` checks the engine and local provider configuration without paid requests; it does not prove provider authentication, permissions or model access. Missing dependencies return 503 with separate details. Frontend proxies also expose `/api/history/health|ready` and `/api/ai/health|ready`.

- **DATABASE_UNAVAILABLE:** check Atlas status, IP allowlist, outbound network/DNS, database user/password and URI. Restart after editing environment files.
- **HISTORICAL_ENGINE_UNAVAILABLE:** check port 3000 readiness. AI must use `HISTORICAL_ENGINE_URL=http://127.0.0.1:3000`.
- **GEMINI_NOT_CONFIGURED / ELEVENLABS_NOT_CONFIGURED:** configure that provider independently of MongoDB.
- **GEMINI_PERMISSION_DENIED:** check ADC, project permissions, API enablement and model access.
- **AUDIO_NOT_FOUND:** tokens expire after 15 minutes, may be evicted sooner and disappear on restart. Generate again.

Vite proxies are development-only. Static production assets need equivalent reverse-proxy rules for every API path, including audio, plus running backends. Public deployment and paid infrastructure are outside this pass.

Before claiming team-wide connectivity, a second teammate must run `check:db` and load live events. Before claiming full AI/voice completion, configure providers and successfully ask one real Gemini question and play one real ElevenLabs briefing. Fixtures do not replace those checks.
