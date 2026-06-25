# Copa Fantasy 2026

A draft-based World Cup fantasy game. Create or join a game by code, snake-draft
national teams across four pots, pick players for each team, choose a captain,
then score points live as real matches complete.

**Stack:** React 18 + Vite + React Router · Supabase (Postgres, Realtime, Edge
Functions) · deployed on Vercel.

## Getting started

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
npm run preview  # serve the production build
npm test         # run unit tests (Vitest)
```

### Configuration

Supabase config is read from Vite env vars and falls back to the bundled project
if unset. Copy `.env.example` to `.env` to override (e.g. for staging):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Project structure

```
src/
  views/        route-level screens (Home, Lobby, Draft, Leaderboard/Hub, …)
  components/   presentational + interactive UI pieces
  hooks/        data hooks backed by Supabase queries + Realtime subscriptions
  lib/          pure logic (draft order, scoring, session, game codes, client)
supabase/
  functions/    edge functions (see note below)
scripts/        one-off backfill scripts (teams/players/fixtures from API-Football)
```

## Known issues / follow-ups

These came out of an audit and are tracked here so they aren't lost. The most
important ones require decisions or live infrastructure changes:

- **Row-Level Security is disabled on all tables (critical).** The anon key has
  full read/write to every row, and `game_players.token` / `games.host_token`
  (the app's only credentials) are readable by anyone. All "host"/"your turn"
  checks are client-side only. This needs a real authorization model (move
  mutations behind Edge Functions / RPCs, then enable RLS) before the app can be
  considered secure.
- **Scoring source of truth is fragmented.** `lib/scoring.js`, `lib/constants.js`
  and the deployed `calculate-scores` edge function disagree on point values, and
  the "How Points Work" modal doesn't reflect the bonuses the engine actually
  awards (braces, hat tricks, upsets, group finishes). Pick one source and
  generate the modal from it.
- **Edge functions are not all version-controlled.** Several deployed functions
  (`calculate-scores`, `sync-match-events`, `sync-fixtures`, `auto-sync`,
  `img-proxy`, …) live only on Supabase. Pull them into `supabase/functions/`.
  Remove leftover debug functions (`bdl-debug`, `hl-debug`, `hl-fix-missing`).
- **Rotate the API-Football key** that was committed in
  `supabase/functions/backfill/index.ts` and move it to an env var.
- **No database migrations.** The schema exists only in the live project; add
  `supabase/migrations/` so it's reproducible.
