# Checkmate

Small daily habits. Lasting progress.

The current release is a responsive **Next.js + TypeScript PWA** in [apps/web](apps/web). Open Today, check off your daily habits, and keep moving. It works locally without an account and is prepared for Supabase account sync and Vercel hosting.

- Today cards with check/undo, streak counts, and clear completion states.
- Quick habit creation with optional icons.
- Current/longest streaks and an editable history calendar.
- Rename, accessible reorder controls, archive, and restore.
- IndexedDB persistence and offline app shell.
- Supabase email-auth integration, queued sync, and PostgreSQL owner-isolation policies.
- Automated domain, browser/offline, and database checks.

```sh
cd apps/web
npm install
npm run dev
```

See the [web setup and deployment guide](apps/web/README.md). Live Supabase/Vercel configuration is required for hosted accounts and cross-device sync; local tracking does not require either service.

## Existing Swift core

The prior portable Swift package remains in `Sources/CheckmateCore`, with its tests in `Tests`. It supports daily check-ins, streak goals, and consistency percentage goals. It is retained for future native clients; this web release uses TypeScript domain logic and does not ship a Swift/Wasm bridge.

```sh
swift build
swift test
swift run checkmate
```
