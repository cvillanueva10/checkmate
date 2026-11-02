# Checkmate

The current product direction is a responsive web-first daily habit tracker/PWA in `apps/web`. Use Next.js, TypeScript, Tailwind, IndexedDB, Supabase, and Vercel. This supersedes the older iOS-first plan for this release.

- Today is the home screen. Preserve quick check/undo and account-free local use.
- Store completion history as source of truth. A habit is daily; a streak is derived.
- Keep all date operations in `apps/web/lib/domain.ts` calendar-based and use the saved profile timezone.
- An incomplete today preserves yesterday's streak until midnight; missing a full day resets it.
- Undo must keep a sync tombstone, and retries must never resurrect an older completion.
- Keep the IndexedDB queue transactional and durable. Never await network access before a local checkoff.
- Account data and guest data are isolated. Import guest habits only with an explicit user action.
- Keep archived habits and their history. No permanent deletion flow is requested.
- Use public Supabase keys only in browser builds and keep owner-based RLS policies on all tables.
- Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run test:e2e` from `apps/web`. Run database policy tests using the isolated CI PostgreSQL setup.
- Live auth/sync checks require a configured Supabase project. Do not claim them verified from a guest-mode test.
- Preserve the existing Swift package in `Sources` and `Tests`. If modifying it, run `swift build`, `swift test`, and `swift run checkmate`.
- Defer reminders, weekly schedules, step integrations, and social features.

See `apps/web/README.md` for setup, conflict policy, offline limits, and Vercel deployment.
