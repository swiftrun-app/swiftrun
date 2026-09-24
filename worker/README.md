# SwiftRun Workers (Cloudflare)

The SwiftRun v2 backend and web app, running on Cloudflare. Ported from
Node/Express + better-sqlite3 (`~/workspace/swiftrun/backend/`). Behavior is
identical to the Express version: same paths, request/response shapes, status
codes, validation, booking status machine, JWT auth (HS256, 24h), bcrypt
password hashing, rate limits (20/15min on `/api/auth/*`, 300/15min elsewhere),
CORS (`GET/POST/PATCH/OPTIONS`), and the 100kb JSON body limit.

## Files

- `src/index.js` - the whole API as a plain Cloudflare Worker ES module
  (no framework). This is the canonical source: it is byte-identical to the
  live `swiftrun-api` deployment, which passed 33/33 endpoint checks.
  D1 binding: `DB`. Secret: `JWT_SECRET` (set via the dashboard or API).
  To redeploy: `npx wrangler deploy` (uses `wrangler.toml`).
- `web-src/web.js` - the `swiftrun-web` worker that serves the single-file web
  app on all paths. Regenerate from `../web/dist/index.html` if the web app
  changes, then redeploy the `swiftrun-web` worker.
- `schema.sql` - D1-compatible schema (from `backend/src/db.js`).
- `seed.sql` - demo seed data (from `backend/src/seed.js`). Demo credentials:
  - admin: `72170001` / `admin1234`
  - runner: `72111111` / `runner1234`
  - demo customer: `72170000` / `demo1234`
- `wrangler.toml` - worker name `swiftrun-api`, D1 database `swiftrun`.

## Custom domains

- `api.swiftrun.online` -> `swiftrun-api` worker
- `swiftrun.online`, `www.swiftrun.online` -> `swiftrun-web` worker

(Attached in the Cloudflare dashboard under Workers & Pages > Domains & Routes.)
