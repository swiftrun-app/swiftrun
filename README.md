# SwiftRun v2.0

SwiftRun is a runner/errand marketplace for Botswana, in the style of Airbnb.
Customers browse services and runners, book errands, and track them through a
simple status flow. Runners accept jobs, go en route, and mark deliveries.
Prices are in Pula (P). The Android app works fully offline in demo mode,
using bundled Botswana demo data when no backend is configured.

## Project structure

```
SwiftRun.apk        Release-signed Android APK (v2.0, versionCode 2), ready to install
web/                React web app (Vite). Built as one self-contained index.html
backend/            Node/Express + SQLite REST API (JWT auth, booking status machine)
android/            Android shell: WebView wrapper, manifest, icons, build notes
release.keystore    Release signing key (LOCAL ONLY, git-ignored, never committed)
```

## Run the web app locally

```bash
cd web
npm install
npm run build        # -> dist/index.html (single file, everything inlined)
```

Open `web/dist/index.html` in a browser, or serve it with any static server.
To point the app at a hosted backend, set `VITE_API_URL` before building:

```bash
VITE_API_URL=https://your-backend.example.com npm run build
```

The app is a single file on purpose. The Android WebView loads it from
`file:///android_asset`, where the browser CORS-blocks ES module scripts, so a
normal multi-file Vite build renders a blank screen. Single file means no
subresource fetches and no CORS problem.

## Run the backend

```bash
cd backend
npm install
cp .env.example .env   # then set a real JWT_SECRET
node src/seed.js       # seed demo data (skips if data exists; --reset to wipe)
npm start              # serves on PORT (default 4000)
```

Env vars:

| Var | Default | Notes |
|-----|---------|-------|
| `PORT` | `4000` | Listen port |
| `JWT_SECRET` | (dev default) | Required in production. The server refuses to start in `NODE_ENV=production` without it |
| `CORS_ORIGIN` | `*` | Allowed origin for the web app |
| `DB_PATH` | `./data/swiftrun.db` | SQLite file location |

Demo logins (from the seed): customer phone `72170000` / password `demo1234`,
runner (Portia S.) phone `72111111` / password `runner1234`. Botswana phone
rule: 7 or 8 digits starting with `7`.

Key endpoints (full reference in `backend/README.md`):

- `GET /api/health` — health check, returns `{ok, version, time}`
- `POST /api/auth/register` — body `{name, phone, password, role}` (customer or runner)
- `POST /api/auth/login` — body `{phone, password}`, returns a 24h JWT
- `GET /api/runners` — runners with live average rating and review count (`?zone=`, `&min_rating=`)
- `GET /api/services` — active services with runner info (`?category=`, `&zone=`, `&q=`)
- `GET /api/leaderboard`, `GET /api/zones`
- `POST /api/bookings` (auth) — customer books a service; status starts at `pending`
- `PATCH /api/bookings/:id` (auth) — status moves: `pending` -> `accepted` -> `en_route` -> `delivered`, or `cancelled` by the customer. Invalid moves return 409
- `POST /api/reviews` (auth, customer only) — one review per delivered booking; runner rating is recomputed

Security: helmet headers, rate limits (20 req / 15 min on auth, 300 req / 15 min
on the API), zod validation on every input, bcrypt password hashing (10 rounds),
prepared statements everywhere, and no stack traces sent to clients.

## How the APK was built

The sandbox blocks the Gradle daemon, so the APK is assembled with the Android
SDK build-tools directly (`aapt2`, `javac`, `d8`, `zipalign`, `apksigner`),
following `android/BUILD_NOTES.md`. The web app is built as the single-file
`index.html` and copied into the WebView assets. The APK is signed with the
release keystore (see below).

## Install the APK

1. Copy `SwiftRun.apk` to the phone.
2. Allow installs from unknown sources when prompted.
3. On Samsung phones, turn off **Auto Blocker** (Settings > Security and privacy > Auto Blocker), or the install will be blocked.
4. **Uninstall the old v1 app first.** v2.0 is signed with a different key than
   the debug-signed v1 builds, and Android refuses to upgrade across signatures.

## Demo mode vs live backend

With no `VITE_API_URL` set at build time, the app runs in offline demo mode:
listings, zones, bookings and notifications come from bundled local data and
persist in the phone's local storage. When `VITE_API_URL` points at a hosted
backend, read endpoints (runners, services, zones) load live data, and the app
still falls back to the bundled data silently if the network fails, so the app
never shows errors offline.

## Play Store next step

`release.keystore` lives at the repo root on the local machine only. It is
git-ignored and must never be committed or shared. Keep the file and its
passwords safe: Google Play and Android both require every future release to be
signed with the same key, or existing users cannot upgrade. The v2.0 cert
fingerprint (SHA-256) is `cf3beba9d1f40438ffd16747fd753825bca84b76a4c88555c189fc67b7dce016`.
