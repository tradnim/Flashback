# Mario — Frontend/UI

Own this folder. Build the Chernobyl experience UI: landing page, timeline, simulated clock, demo-speed control, question panel, and radio briefing controls. The current page is intentionally a bare starter template. Keep historical facts in the historical service; consume them through the agreed API contract.

## Start

From this folder, run `npm install`, then `npm run dev`. Vite prints the local URL. The current page is a standalone shell; service-backed panels remain placeholders until integration.

## Files

- `index.html` — basic page structure and empty feature sections
- `src/main.js` — small demo clock and start/pause control
- `src/styles.css` — minimal starter styling

Coordinate endpoint or payload changes in `../integration-infra/API_CONTRACT.md` with Chris before wiring the API.
