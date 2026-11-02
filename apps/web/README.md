# Checkmate web

A responsive Next.js/TypeScript daily habit tracker, styled with Tailwind CSS. The first screen is Today. Create habits, check/undo, rename, reorder, archive/restore, and correct history in the calendar. All progress is stored in IndexedDB before any network call. No account is required.

## Run

Node 22 is recommended.

```sh
cd apps/web
npm install
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The build generates PNG installation icons from a code-native checkmark. HTTPS (or localhost) is required for service workers and installation. The shell caches only public same-origin assets, never Supabase responses. Offline use requires one successful online visit with assets cached. Updates become active after closing existing app tabs.

## Connect Supabase

1. Create/select your Supabase project.
2. Apply `supabase/migrations/202611010001_habits.sql` in its SQL editor or migration workflow. Do not apply `supabase/tests/bootstrap.sql` to Supabase; that auth shim exists only for isolated CI PostgreSQL.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your project. Never use a service-role key in browser configuration.
4. Enable email authentication and add your exact app origin and localhost origin to the allowed redirect URLs. Magic links return to `/`.
5. Restart Next.js (public environment values are bundled at build time).
6. Open Account to sign in. Guest and signed-in records use separate local stores. Import guest habits only through the explicit account action. Signing out switches to guest storage; signing back into the same account restores that account's cached data.

## Sync semantics

- Local updates are transactional. The queue survives reloads. Changes to the same row collapse to the latest mutation.
- While the app is open, sync retries with backoff, on reconnect, and on returning to the tab. No OS-level background service is promised when the app is closed.
- Each daily check has a unique habit/date key. Undo clears completion but retains a sync tombstone so old devices cannot resurrect it.
- The server accepts only newer `(updated_at, mutation_id)` versions for the same row; independent days merge. The tie-breaker is deterministic. Device clocks should be accurate; this first version uses client timestamps rather than a causal multi-device conflict UI.
- An acknowledgement removes only its exact mutation, preserving edits made during a network request. Pulls include pagination.
- The first account login saves a canonical timezone in the profile. New devices must obtain it online once before checkoffs are enabled; a previously initialized account works offline. Timezone changes are intentionally not exposed. Travel never reinterprets stored dates.
- An unchecked today retains yesterday's streak; a full missed day resets it. Longest streak is derived from history. Past corrections recalculate all displayed stats.
- Archived habits retain their full history; restore makes them active again. No hard deletion is exposed.

## Vercel deployment

Import `cvillanueva10/checkmate` into Vercel, choose Next.js, and set **Root Directory** to `apps/web`. Use Node 22, the default `npm run build` command, and default Next.js output handling. Add the two public Supabase environment variables for Preview and Production, then deploy. Add each approved preview/production URL to Supabase Auth's redirect allowlist. Do not use broad untrusted redirect wildcards.

Without Supabase configuration, local tracking still works; the account screen explains why sync is unavailable. Live Supabase and Vercel resources must be connected separately before account and cross-device smoke tests can be run.

## Release checks

CI validates domain rules, browser flows on desktop/mobile Chromium, offline reload, PostgreSQL ownership policies, check uniqueness and stale retry/undo behavior. Before release, also verify home-screen installation on a real iPhone, a two-device sign-in/sync session, timezone consistency across devices, and email delivery against the actual Supabase project. Database/auth integration is not mocked as production-verified.

Reminders, weekly schedules, sensor integrations, social features, and the existing Swift percentage-goal features are outside this web MVP.
