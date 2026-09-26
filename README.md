# Chernobyl: Live Through History

A small, frontend-first hackathon project. The interface presents a simulated historical clock and event stream; the backend services will add spoiler-safe questions and radio briefings.

## Start the app

Requirements: Node.js and npm.

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The frontend runs by itself; until the services are connected, the timeline, historian, and radio briefing show clear placeholder states.

## Who works where

| Person | Folder | Ownership |
|---|---|---|
| Mario | `frontend/` | Landing and history screens, timeline, live clock, speed controls, responsive UI |
| James | `backend/historical-engine/` | Verified event dataset, simulated-time logic, MongoDB event queries, event unlocking |
| Noriel | `backend/ai-voice/` | Gemini Temporal RAG, spoiler protection, ElevenLabs broadcast generation |
| Chris | `integration-infra/` | MongoDB Atlas, API contract and integration, deployment, domain, demo/release coordination |

Each folder has its own README with the owner's starting point. Put shared API decisions in [`integration-infra/API_CONTRACT.md`](integration-infra/API_CONTRACT.md) before implementing against them.

## Working together

- Work inside your assigned folder. Coordinate changes to the API contract before changing endpoint names or payloads.
- Keep historical event content and citations in the historical engine; the frontend should not become a second source of historical facts.
- The simulated timestamp is the source of truth. Services must not return or provide the AI with events later than that time.
- Add secrets to local environment configuration, never to committed files. Chris should provide a safe example `.env.example` when service configuration is added.

## Current state

The frontend is a bare starter template with a working demo clock and speed control. Backend folders contain ownership notes and API boundaries so each person can begin independently.
