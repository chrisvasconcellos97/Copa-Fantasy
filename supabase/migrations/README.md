# RLS / auth migrations

These implement the rollout in `docs/SECURITY_PLAN.md` (Option B: per-player
signed JWT + `SECURITY DEFINER` RPCs, then RLS).

> **Status: drafted but NOT yet applied.** They were authored in a session where
> the Supabase MCP could not apply/verify them. Review and apply **in order**,
> running `get_advisors(security)` after each, and do not skip the sequencing —
> phases 4–6 will take the app offline if applied before the client is wired.

## Apply order

| # | File | Risk | Depends on |
|---|------|------|------------|
| 1 | `…_create_secrets_tables.sql` | additive, safe | — |
| 2 | `…_rpc_game_lifecycle.sql` | additive, safe | 1 |
| 3 | `…_rpc_gameplay_writes.sql` | additive, safe | 1 |
| 4 | `…_enable_rls_owned_tables.sql` | **breaking** | client wired to JWT + RPCs |
| 5 | `…_enable_rls_remaining.sql` | **breaking** | client wired to lifecycle RPCs |
| 6 | `…_drop_secret_columns.sql` | **breaking, final** | client no longer reads token/host_token |

Phases 1–3 are additive: applying them changes nothing observable (direct writes
still work), so they are safe to apply immediately. Phases 4–6 are the cut-over
and **must** follow the client changes (SECURITY_PLAN.md task 5):

- attach the per-player JWT (from the `auth-issue` function) to the supabase client,
- call `create_game` / `join_game` / `rejoin_lookup` / `advance_phase` /
  `rename_player` / `boot_player` / `split_group` instead of direct
  `games` / `game_players` writes,
- call `make_draft_pick` instead of inserting `draft_picks`,
- call `add_team_result` / `add_bonus` / `override_score` instead of writing
  `user_scores`,
- keep writing `player_picks` / `captain_picks` / `substitutions` / `notifications`
  directly (now governed by the RLS write-own policies, with the JWT attached).

## Prerequisites before phase 4

- Deploy the `auth-issue` edge function (`verify_jwt = false`) and set the
  `SUPABASE_JWT_SECRET` function secret to the project JWT secret.
- Redeploy `calculate-scores` and `auto-sync` (captain doubling + 15/10/5 group
  bonuses are committed locally but not yet deployed).

## Verification checklist (from SECURITY_PLAN.md)

- [ ] A normal player can read leaderboard / draft / fixtures.
- [ ] A console `update('user_scores')` fails.
- [ ] `select('token')` / `select('host_token')` return nothing (columns gone).
- [ ] A non-host calling a host RPC is rejected (`is_host` check).
- [ ] Drafting out of turn (direct insert) is rejected.
- [ ] Realtime still delivers updates.
