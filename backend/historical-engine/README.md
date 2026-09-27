# James — History engine

Express/Mongoose service: http://127.0.0.1:3000. Only this service accesses Atlas. Requires Node.js 22+.

```powershell
npm ci
# Copy .env.example to .env only if absent; privately set MONGO_URI.
npm run seed
npm start
npm test
npm run check:db
npm run check:db -- --verify-seed
```

`MONGO_URI` is mandatory. The database is `chernobyl_simulation`. Startup pings MongoDB, uses bounded connection/query timeouts and exits nonzero on failure. No local fallback or automatic seed.

Seeding creates indexes and inserts missing event IDs only. Existing records, including their timestamps, remain unchanged. Edit existing data through a deliberate reviewed migration. `check:db` is read-only unless `--verify-seed` is supplied; that flag seeds twice and compares snapshots/counts. Unit tests use controlled repository fixtures, not the shared database.

`GET /api/events?simulationTime=<UTC timestamp>` returns the existing `status`, `authoritativeClock`, `count`, `data` envelope. Queries require `isVerified: true` and the inclusive time cutoff. `/health` is liveness; `/ready` pings MongoDB.

Source layout remains under `src/src/models/src/`: data, models, services and routes. Connection configuration is `src/database.js`. Existing event content still needs James's source review; integration checks do not establish historical accuracy. See the root guide for setup.
