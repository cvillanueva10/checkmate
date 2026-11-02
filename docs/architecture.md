# Checkmate architecture

## Current release: web first

The first release is a phone-friendly web app/PWA under `apps/web`. This direction supersedes the prior iOS-first roadmap for the current release. The existing Swift core and its tests remain available for future native clients.

- Interface: Next.js App Router + TypeScript.
- Styling: Tailwind CSS with a quiet green, readable mobile layout.
- Persistence: IndexedDB transactions, isolated per guest/account.
- Backend: Supabase email authentication and PostgreSQL with RLS.
- Hosting: Vercel, with `apps/web` as the project root.

## Data flow

The UI changes local state through an IndexedDB transaction. Each mutation joins a durable queue; no checkoff waits for a network request. A foreground sync loop uploads idempotent mutations and pulls server rows. Retries use backoff and reconnect/visibility signals. Older checkoffs cannot overwrite a newer undo, because the tombstone and mutation version remain.

Daily completion is unique per habit and saved local calendar date. Streak calculations consume the history and canonical account timezone. Current streak may end yesterday until today ends. Missing a full day breaks the current streak. Past corrections update current/longest streaks. Archiving hides habits from Today without deleting progress.

All account rows belong to an authenticated user. RLS checks both ownership and the habit/check relationship. Guest habits stay separate unless imported. New account devices must obtain the server timezone online before checkoffs; initialized devices can continue offline.

See `apps/web/README.md` for setup, sync conflict policy, release checks, and deployment.
