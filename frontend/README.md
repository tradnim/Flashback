# Mario — Frontend/UI

> Scope reminder: Stay inside `frontend/` unless the user explicitly authorizes cross-project work. This shared-database integration pass is authorized across the project.

Keep the responsive Flashback design simple. The frontend owns the simulation clock, rendering and feedback; records belong to the engine.

```powershell
npm ci
npm run dev
npm test
npm run build
```

For all services use the root guide and `node integration-infra/start.mjs`. Vite uses port 5173, forwarding events to 3000 and questions/broadcasts/audio to 8000. Only service addresses may use `VITE_HISTORY_ENGINE_URL` and `VITE_AI_VOICE_URL`, never credentials.

All requests use `simulationTime`. Rendering requires verified records unlocked by the clock. Live failures retain the last successful timeline and display separate timeline, question and audio errors.

Select **Offline demo** for two sample events and text-only responses without services. It is never automatic. Switching modes clears stale answers/audio and restores cached live records while reconnecting.

Playback supports same-origin paths, HTTP(S) and base64 audio data URLs. Expired/unplayable links prompt regeneration. Vite proxies audio seeking too.

Main files: `index.html` (structure), `src/main.js` (clock/state/API), `src/styles.css` (theme), `src/audio-url.js` (URL validation). Static builds need production reverse-proxy routes and backends to use live features.
