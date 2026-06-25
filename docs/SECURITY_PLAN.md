# Security & Authorization Plan (RLS)

Status: **proposal for review — do not apply to production without sign-off.**

This document addresses the critical audit finding: **Row-Level Security is
disabled on all 18 tables, and the app's only credentials (`game_players.token`,
`games.host_token`) are readable by anyone with the public anon key.** Today every
"host-only" / "your turn" check is client-side cosmetic and trivially bypassed
from the browser console.

---

## The core constraint

The app does **not** use Supabase Auth. There is no `auth.uid()` — every request
hits Postgres as the shared `anon` role, identified only by a random token the
client keeps in `localStorage`. Postgres therefore has **no idea who the caller
is**, so you cannot write a naive policy like *"users may update only their own
picks."*

Two consequences:

1. **Just running `ENABLE ROW LEVEL SECURITY` takes the app offline.** With RLS on
   and no policies, all of the client's direct reads *and writes* are denied. The
   current architecture writes everything directly from the browser, so security
   requires changing *how* writes happen — there is no config-only fix.
2. **To enforce per-player/host rules, the database needs an identity.** That means
   either (Option A) moving writes to trusted server code, or (Option B) giving
   each player a signed token the DB can verify.

---

## Two viable target architectures

### Option A — Server-authoritative writes (most robust)
Move every mutation behind an Edge Function (or `SECURITY DEFINER` RPC) that runs
with the service role, validates the caller's token, enforces the rule
(turn order, host-only, phase), then writes. Enable RLS with **read-only** anon
policies and **no** write policies, so the browser can never write directly.

- **Pros:** strongest guarantees; turn-order / scoring logic lives in one trusted
  place; tokens never need to be client-readable.
- **Cons:** most code churn — ~10 new server endpoints and matching client calls.

### Option B — Per-player signed JWTs + RLS (pragmatic, recommended)
A tiny Edge Function issues a **signed JWT** (claims: `player_id`, `game_id`,
`is_host`) at create/join/rejoin time, signed with the project JWT secret. The
client attaches it to the Supabase client (`supabase.auth.setSession` / a custom
header). Now RLS policies can read `auth.jwt() ->> 'player_id'` and enforce
ownership directly, while the realtime client model is preserved.

- **Pros:** keeps the existing client-driven reads/writes and Realtime; far less
  client rewrite; ownership enforced in policies.
- **Cons:** rules that span multiple rows (draft **turn order**, **score writes**)
  are awkward to express in pure RLS and still need a `SECURITY DEFINER` RPC or a
  trigger.

**Recommendation: Option B as the backbone, with a few Option-A style RPCs** for
the handful of operations that need cross-row validation (make draft pick,
advance phase, all host scoring actions). This gets ~90% of the safety for a
fraction of the work and keeps the app's live-updating feel.

---

## Token secrecy (do this regardless of option)

`game_players.token` and `games.host_token` must stop being selectable by `anon`.
Move them into a table that has **no read policy** (only service role / the JWT
issuer touches it):

```sql
-- Secrets live in their own table, never exposed to the client.
create table public.player_secrets (
  game_player_id uuid primary key references public.game_players(id) on delete cascade,
  token text not null unique
);
create table public.game_secrets (
  game_id uuid primary key references public.games(id) on delete cascade,
  host_token text not null
);
-- Backfill from existing columns, then drop the columns from the exposed tables.
```

The client never reads these again — rejoin and host detection go through the JWT
issuer / RPCs instead of `select('host_token')`.

---

## Phased rollout (zero-downtime ordering)

Each phase is independently deployable and reversible.

1. **Issue JWTs.** Add an Edge Function `auth-issue` that takes a player token,
   verifies it against `player_secrets`, and returns a signed JWT. Wire
   create/join/rejoin to call it and store the JWT. *(No security change yet —
   purely additive.)*
2. **Add write RPCs** for the cross-row operations: `make_draft_pick`,
   `advance_phase`, `add_team_result`, `add_bonus`, `override_score`,
   `recalculate`. Each validates JWT claims server-side. Switch the client to call
   them. *(Still additive — direct writes still work.)*
3. **Migrate secrets** into `player_secrets` / `game_secrets`; update the client to
   stop selecting `token` / `host_token`; drop those columns.
4. **Enable RLS + policies** (below). Verify reads still work and writes only
   succeed through RPCs/owned rows. *This is the phase that actually closes the
   hole.*
5. **Harden reads (optional phase 2):** scope `notifications` to the owning player,
   and decide whether draft picks of other games should be world-readable.

---

## Illustrative policies (Option B, after phases 1–3)

```sql
-- Reference data: readable by all, never written by clients.
alter table public.teams    enable row level security;
alter table public.players  enable row level security;
alter table public.fixtures enable row level security;
alter table public.match_events enable row level security;
create policy "read teams"    on public.teams    for select using (true);
create policy "read players"  on public.players  for select using (true);
create policy "read fixtures" on public.fixtures for select using (true);
create policy "read events"   on public.match_events for select using (true);
-- (no insert/update/delete policies -> only the service role / sync functions write)

-- Player-owned rows: owner may write their own, everyone in the game may read.
alter table public.player_picks enable row level security;
create policy "read picks in game" on public.player_picks
  for select using (true);
create policy "write own picks" on public.player_picks
  for all using ( game_player_id::text = (auth.jwt() ->> 'player_id') )
  with check ( game_player_id::text = (auth.jwt() ->> 'player_id') );

-- captain_picks, substitutions: same shape as player_picks.

-- Scores: read-only to clients; written only by host RPCs (service role).
alter table public.user_scores enable row level security;
create policy "read scores" on public.user_scores for select using (true);
-- no client write policy.

-- Draft picks: inserted only via make_draft_pick RPC (turn order can't be
-- expressed safely in RLS), so client gets select-only.
alter table public.draft_picks enable row level security;
create policy "read draft picks" on public.draft_picks for select using (true);

-- Notifications: scope to the owning player.
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications
  for select using ( game_player_id::text = (auth.jwt() ->> 'player_id') );
```

`games` / `game_players` get `select using (true)` (minus the secret columns,
which now live elsewhere); writes go through `create_game` / `join_game` /
`advance_phase` RPCs.

---

## Verification checklist

- [ ] As a normal player, you **can** read the leaderboard, draft, fixtures.
- [ ] As a normal player, a console `update('user_scores')` **fails**.
- [ ] You **cannot** select any `token` / `host_token` from the client.
- [ ] A non-host calling a host RPC is rejected by the JWT `is_host` check.
- [ ] Drafting out of turn (direct insert) is rejected (RLS select-only +
      RPC turn check).
- [ ] Realtime subscriptions still deliver updates (policies allow the relevant
      `select`).

## Rollback

Each phase is reversible: re-add columns / `disable row level security` per table.
Because phases 1–2 are additive, the risky phase (4) can be toggled per-table, so
you can enable RLS on low-risk tables first (`teams`, `fixtures`, `players`,
`match_events` — pure reference data, safe to lock immediately) and work up to the
gameplay tables.

## Quick win available today

Even before the full plan, the four **reference tables** (`teams`, `players`,
`fixtures`, `match_events`) are only ever written by server-side sync functions —
you can enable RLS with a `select using (true)` policy on those **right now** with
zero client impact, shrinking the writable surface from 18 tables to 14.
