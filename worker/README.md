# SwiftRun Worker (Hono + D1)

The SwiftRun v2 API ported from Node/Express + better-sqlite3 (`~/workspace/swiftrun/backend/`)
to a Cloudflare Worker using Hono and D1. Behavior is identical to the Express
version: same paths, request/response shapes, status codes, zod validation,
booking status machine, JWT auth (HS256, 24h), bcrypt password hashing,
rate limits (20/15min on `/api/auth/*`, 300/15min elsewhere), CORS
(`GET/POST/PATCH/OPTIONS`), and the 100kb JSON body limit.

## Files

- `src/index.js` - the whole API. Validation schemas copied from the backend;
  auth middleware uses `hono/jwt`; D1 queries use `env.DB.prepare(...).bind(...)`,
  with `env.DB.batch([...])` for multi-statement transactions.
- `schema.sql` - D1-compatible schema (from `backend/src/db.js`).
- `seed.sql` - demo seed data (from `backend/src/seed.js`). Contains bcrypt
  hashes for demo-only accounts. Demo credentials:
  - admin: `72170001` / `admin1234`
  - runner: `72111111` / `runner1234`
  - demo customer: `72170000` / `demo1234`
- `wrangler.toml` - worker name `swiftrun-api`. The `database_id` is a
  placeholder; fill it in after `wrangler d1 create`.

## Local development

```bash
cd ~/workspace/swiftrun/worker
npm install
npx wrangler dev --local
```

Apply schema + seed to the local D1 database, then smoke-test:

```bash
npx wrangler d1 execute swiftrun --local --file schema.sql
npx wrangler d1 execute swiftrun --local --file seed.sql
curl -s http://127.0.0.1:8787/api/health
```

Local dev uses a `dev-only-secret-do-not-use-in-production` JWT fallback. Real
deployments set `JWT_SECRET` via `wrangler secret put`.

## Deploy (remote)

```bash
cd ~/workspace/swiftrun/worker

# 1. Create the D1 database and paste the returned id into wrangler.toml
npx wrangler d1 create swiftrun

# 2. Apply schema and seed data
npx wrangler d1 execute swiftrun --remote --file schema.sql
npx wrangler d1 execute swiftrun --remote --file seed.sql

# 3. Set the JWT secret (never in a file)
npx wrangler secret put JWT_SECRET

# 4. Deploy
npx wrangler deploy
```

The custom hostname `api.swiftrun.online` is attached to the worker from the
Cloudflare dashboard after deploy.
