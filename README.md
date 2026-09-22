# SwiftRun

SwiftRun is a runner-errand and delivery platform for Botswana. Customers book
runners for pickups, drop-offs, shopping, bill payments, medication runs and
government office errands. The app includes a futures market for errands, an
AI errand planner, storefronts, runner leaderboards, gift errands, zone
franchises, diaspora gifting, SwiftRun Score and enterprise tools.

Support: **+267 72173308** (call or WhatsApp).

## This build

- Web app: React + Vite (`src/`), fully offline. All data is local demo data.
- AI Errand Planner: runs 100 percent on-device with a keyword-based planner.
  No network calls, no API keys.
- Android app: `SwiftRun.apk` in the repo root. A minimal native WebView shell
  (`android/`) that loads the bundled web app from the APK assets. Works
  offline across Botswana.

## Install the APK on Android

1. Copy `SwiftRun.apk` to the phone (download, WhatsApp, USB, etc.).
2. Open it. If Android blocks the install, allow "Install unknown apps" for
   the app you are installing from (e.g. Files or Chrome), then install again.
3. Open SwiftRun from the app drawer.

The APK is signed with a debug key, so it is best for testing and sharing
with early users. Before a Play Store release, sign a release build with a
proper upload key.

## Rebuilding

Web app:

```sh
npm install
npm run build   # outputs to dist/
```

Copy `dist/` to `android/app/src/main/assets/www`, then rebuild the APK with
the Android SDK build-tools (aapt2, d8, zipalign, apksigner). See
`android/BUILD_NOTES.md` for the exact commands used for this release.

## Status

Demo mode. All runners, prices, leaderboards and orders shown in the app are
sample data stored locally in the app. There is no live backend yet.
