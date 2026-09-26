# James — Historical Engine

Own this folder. Maintain the verified Chernobyl event dataset, simulation-time rules, event unlocking, and MongoDB event queries. Keep source citations with the events so the UI and AI can rely on a traceable record.

## Start here

1. Agree event fields and endpoint payloads with Chris in `../../integration-infra/API_CONTRACT.md`.
2. Add the event schema and a small, cited initial dataset here.
3. Implement the time filter so only events at or before the requested historical timestamp are returned.
4. Keep future events out of all responses consumed by the UI and AI.

The frontend clock is currently a visual demo. The API should become the authoritative clock and event source during integration.
