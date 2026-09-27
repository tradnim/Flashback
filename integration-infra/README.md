# Chris — Integration / Infrastructure

Own Atlas setup, service configuration, the API contract, startup and end-to-end verification. Follow the root setup guide, then run `node integration-infra/start.mjs` from the root.

The command checks settings/ports, starts the engine after a database ping, then AI and Vite. It cleans up its own children on failure or Ctrl+C. It never kills existing services or seeds automatically.

## Acceptance checklist

- Confirm free Atlas tier, region, database-scoped user and individual team IP access entries.
- Run engine `check:db -- --verify-seed`; verify stable counts and unchanged records.
- Check each service's readiness and distinguish provider failures from MongoDB failures.
- Run the root guide's tests and production build.
- Exercise events, questions, broadcasts and audio seeking through port 5173, including disconnected dependencies.
- Configure providers privately and make one real Gemini request and one real ElevenLabs briefing.
- Have another teammate run `check:db` and load live events before claiming team-wide connectivity.

Public deployment, paid infrastructure, notifications and jump-to-event features are excluded. Later production hosting needs the same API routing as the Vite development proxy.
