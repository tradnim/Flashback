# Mario — Frontend/UI

> **Scope reminder:** Stay inside `frontend/`. Do not read or change files outside this folder unless the user explicitly says to.

Own this folder. Build the Chernobyl experience UI: timeline, simulated clock, demo-speed control, question panel, and radio briefing controls. Keep historical facts in the historical service; consume them through the agreed API contract.

## Start locally

Use two terminals:

1. Start MongoDB locally, or set `MONGO_URI` to your MongoDB connection string.
2. In `backend/historical-engine`, run `npm install` once, then `npm start`.
3. In this `frontend` folder, run `npm install` once, then `npm run dev`.
4. Open the URL Vite prints (usually `http://localhost:5173`).

Vite forwards `/api` requests to `http://localhost:3000`. To use another engine address, set `VITE_HISTORY_ENGINE_URL` before starting Vite. The history engine currently provides the timeline endpoint; the question and audio endpoints require their API service to be connected separately.

## Files

- `index.html` — responsive page structure for the clock, timeline, historian, and radio briefing
- `src/main.js` — simulation clock, API requests, rendering, and loading/error states
- `src/styles.css` — Figma-inspired parchment, brown, terracotta, and olive theme with responsive layout

The timeline sends `GET /api/events?simulationTime=<ISO timestamp>`. It accepts the engine's current `{ data: [...] }` response and the shared `{ events: [...] }` shape. It maps event citations into source links and hides unverified or not-yet-unlocked events. The question and audio panels call `POST /api/ask` with `{ question, simulationTime }` and `POST /api/broadcast` with `{ simulationTime }`; those endpoints need to be provided by the AI/voice service.

Coordinate endpoint or payload changes in `../integration-infra/API_CONTRACT.md` with Chris before wiring the API.
