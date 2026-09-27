# Integration verification — 2026-09-27

## Live evidence

- Supplied Atlas connection authenticated and pinged successfully; database: `chernobyl_simulation`.
- Imported the existing 40 seed events. Consecutive seeds reported zero new records and identical snapshots/counts. No existing shared records were overwritten.
- Engine query and frontend-origin `/api/events` returned six verified records at `1986-04-25T23:45:00Z`; all met the time cutoff.
- Browser displayed the six live records and citations, not demo content.
- Stopping the engine showed a disconnected timeline while preserving the six cached records. Provider configuration errors appeared separately in question and audio panels.
- Explicit demo selection showed two sample records; returning to live restored six records.
- One-command startup brought up the engine, AI API and frontend in order. Missing providers were reported without blocking live events. Interrupting the command closed ports 3000, 8000 and 5173. Occupied-port preflight failed safely without killing an existing process.

## Automated checks

Final suite totals: 6 engine tests, 8 frontend tests and 6 AI/proxy tests passed (20 total). The production build passed.

- History engine: cutoff boundary, invalid/missing timestamps, verified filtering, database outage, insert-only repeat seed, missing configuration.
- AI: real local HTTP fixtures, context/citation filtering, provider configuration errors, dependency outage, audio 200/206/416, expiration 404.
- Vite-origin fixture integration: events, questions, broadcasts, health/readiness and audio ranges/expiration.
- Frontend: URL validation, existing brand/layout checks, explicit demo selection, independent errors and retained live timeline.
- Production frontend build.

Installed google-genai 2.25.0 was inspected and supports the configured `enterprise` client argument. The default model identifier is listed in [Google's model lifecycle documentation](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/model-versions); account-specific model access still needs credentials and a real request.

Provider fixtures return controlled bytes; they do not prove real speech synthesis or browser playback of an ElevenLabs response.

## Outstanding acceptance and security

- The supplied database user has `atlasAdmin` on `admin`, broader than the requested database-only role. Replace it with a user restricted to `readWrite` on `chernobyl_simulation` in the team Atlas console and update the ignored engine `.env`.
- Rotate the database password because it was pasted into chat. Do not commit credentials.
- Cluster tier, region and full team IP list have not been verified through the Atlas account. No new cluster was created because an existing working cluster was supplied.
- Google project/model/ADC and ElevenLabs key/voice ID are not configured locally. Real Gemini and ElevenLabs calls, and browser playback of real provider audio, remain unverified.
- A second teammate must independently connect and load events. This machine's success is not team-wide verification.
- Existing historical event content was preserved; James should review source accuracy and overlapping entries separately.

No paid provider calls or public deployment were performed.
