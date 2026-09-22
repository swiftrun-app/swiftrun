# SwiftRun API (v2 backend)

Express + SQLite REST API for the SwiftRun runner/errand marketplace (Botswana). Prices are in Pula (P).

## Setup

```bash
cd backend
npm install
cp .env.example .env        # then set a real JWT_SECRET
node src/seed.js            # seed demo data (skips if data exists)
node src/seed.js --reset    # wipe and reseed
npm start                   # serves on PORT (default 4000)
```

## Env vars

| Var | Default | Notes |
|-----|---------|-------|
| `PORT` | `4000` | Listen port |
| `JWT_SECRET` | (dev default) | **Required in production.** Server refuses to start in `NODE_ENV=production` without it. A loud warning is printed in dev. |
| `CORS_ORIGIN` | `*` | Allowed origin(s) for the web app |
| `DB_PATH` | `./data/swiftrun.db` | SQLite file location |
| `NODE_ENV` | - | Set to `production` on deploy |

## Auth

JWT Bearer tokens, 24h expiry. Register or login to get one, then send `Authorization: Bearer <token>`.

```bash
# register (role: customer | runner; admin cannot self-register)
curl -X POST localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Neo K","phone":"72123456","password":"secret12","role":"customer"}'

# login
curl -X POST localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"72123456","password":"secret12"}'
# -> {"token":"...","user":{"id":1,"name":"Neo K","phone":"72123456","role":"customer",...}}

# demo customer (from seed): phone 72170000 / password demo1234
# demo runner (Portia S.):   phone 72111111 / password runner1234
```

Botswana phone rule: 7 or 8 digits starting with `7` (e.g. `72123456`).

## API reference

All responses are JSON. Errors are `{"error":"message"}` (validation errors add a `details` array).

### Public

```bash
curl localhost:4000/api/health
# -> {"ok":true,"version":"2.0.0","time":"..."}

# runners, with live avg rating + review count
curl 'localhost:4000/api/runners'
curl 'localhost:4000/api/runners?zone=Game%20City&min_rating=4.7'

# services (active only), joined with runner info
curl 'localhost:4000/api/services'
curl 'localhost:4000/api/services?category=food&zone=CBD%20%2F%20Main%20Mall&q=lunch'
curl localhost:4000/api/services/1

# top runners by rating x runs_completed
curl localhost:4000/api/leaderboard

# Gaborone zones with demand + base price
curl localhost:4000/api/zones
```

### Bookings (auth)

```bash
TOKEN=<your-jwt>

# customer creates a booking for a service (price taken from the service, status: pending)
curl -X POST localhost:4000/api/bookings \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"service_id":1,"pickup":"Main Mall, Nandos","dropoff":"CBD, Plot 77","scheduled_for":"2026-09-23T10:00:00+02:00"}'

# list: customers see their own, runners see assigned, admins see all
curl -H "Authorization: Bearer $TOKEN" localhost:4000/api/bookings

# status changes (validated against the status machine below)
curl -X PATCH localhost:4000/api/bookings/4 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"accepted"}'
```

### Reviews (auth, customer only)

One review per booking, only for delivered bookings. The runner's aggregate rating is recomputed on each review.

```bash
curl -X POST localhost:4000/api/reviews \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"booking_id":4,"rating":5,"comment":"Fast and friendly!"}'
```

## Booking status machine

```
pending  --(runner)--> accepted --(runner)--> en_route --(runner)--> delivered
   |                      |
   +--(customer)--> cancelled
   +--(customer)--> cancelled
```

Rules enforced by the API:

- `pending` -> `accepted`: assigned runner only
- `accepted` -> `en_route`: assigned runner only
- `en_route` -> `delivered`: assigned runner only (increments runner `runs_completed`)
- `pending`/`accepted` -> `cancelled`: booking customer only
- `delivered` and `cancelled` are terminal. Any other transition returns `409`.
- Customers can only touch their own bookings; runners only bookings assigned to them; admins may move any booking.

## Security notes

- `helmet` security headers on every response.
- Rate limits: `20 req / 15 min` per IP on `/api/auth/*`, `300 req / 15 min` per IP on `/api/*`.
- Every input validated with `zod` (body, params and query). Validation failures return `400` with a `details` array.
- Passwords hashed with `bcryptjs` (10 rounds). JWT secret comes from env only; the process exits in production if it is missing.
- All SQL uses prepared statements with bound parameters (better-sqlite3). No string interpolation of user input into queries.
- Central error handler: clients always get `{"error":"..."}`. Stack traces are logged server-side and never sent to clients.
- JSON body limit `100kb`. CORS origin configurable via `CORS_ORIGIN`.
- Demo seed passwords are public by design (`demo1234`, `runner1234`). Never use the seed database in production.

## Project layout

```
backend/
  src/server.js      Express app, routes, status machine, error handling
  src/db.js          SQLite connection + schema (WAL mode, foreign keys on)
  src/auth.js        JWT sign/verify, requireAuth, requireRole
  src/validation.js  zod schemas for every input
  src/seed.js        Botswana demo data (idempotent; --reset to wipe)
  data/swiftrun.db   SQLite file (gitignored)
```
