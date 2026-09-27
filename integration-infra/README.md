# Chris — Integration / Infrastructure

Own this folder. Coordinate the shared API contract, connect the services and MongoDB Atlas, manage the DigitalOcean deployment/domain, and prepare the integrated demo.

## Start here

1. Review and confirm `API_CONTRACT.md` with Mario, James, and Noriel before they wire their parts to it. DONE
2. Create deployment and database configuration here; keep secrets out of Git and provide service-specific `.env.example` files with names only.
=======
2. Create deployment and database configuration here; keep secrets out of Git and provide service-specific `.env.example` files.
>>>>>>> 7b4af41b74af51c035022419d65b85f6f3d0ca7c
3. Bring the frontend and service endpoints together, then write the one-command local start instructions in the root README.
4. Keep a dependable demo path available if external AI or voice APIs are unavailable.

The current frontend starts on its own with the instructions in the root README. No database or API keys are needed to view it.

## Local environment files

Each backend service has a safe `.env.example` template. Copy a template to `.env` only if that service does not already have a `.env` file; do not overwrite a teammate's local file because it may contain private credentials.

```powershell
if (-not (Test-Path backend\historical-engine\.env)) {
  Copy-Item backend\historical-engine\.env.example backend\historical-engine\.env
}

if (-not (Test-Path backend\ai-voice\.env)) {
  Copy-Item backend\ai-voice\.env.example backend\ai-voice\.env
}
```

The historical engine's `npm start` command loads its file with Node's `--env-file` option (Node.js 20.6 or newer). The AI-VOICE server already loads `backend\ai-voice\.env` itself. Set private API keys only in those local `.env` files, which Git ignores. `MONGO_URI` may use the local MongoDB example or a private MongoDB Atlas connection string.

The current `/api/ask` implementation still expects Gemini, but the AI provider is being reassigned. Its key is intentionally commented out in the AI-VOICE example until the team confirms the replacement or a new owner for Gemini.
