-- Phase 5: enable RLS on games / game_players and the remaining legacy tables.
--
-- ⚠️  Apply ONLY AFTER the client is wired to the lifecycle RPCs (create_game,
-- join_game, rejoin_lookup, advance_phase, rename_player, boot_player,
-- split_group). After this, the browser can read games/game_players (needed for
-- the lobby, leaderboard and Realtime) but can no longer write them directly.

-- games: world-readable; writes go through the lifecycle RPCs / service role.
alter table public.games enable row level security;
create policy "read games" on public.games for select using (true);

-- game_players: world-readable (lobby, leaderboard, Realtime INSERT/DELETE);
-- writes via RPCs / service role only.
alter table public.game_players enable row level security;
create policy "read game_players" on public.game_players for select using (true);

-- Legacy / engine-only tables: written exclusively by the sync + scoring
-- functions (service role). Enable RLS with read-only client access so nothing
-- is client-writable. (All are currently empty.)
alter table public.match_results       enable row level security;
alter table public.team_results        enable row level security;
alter table public.player_match_stats  enable row level security;
alter table public.player_results      enable row level security;
alter table public.hero_bonuses        enable row level security;
alter table public.score_overrides     enable row level security;

create policy "read match_results"      on public.match_results      for select using (true);
create policy "read team_results"       on public.team_results       for select using (true);
create policy "read player_match_stats" on public.player_match_stats for select using (true);
create policy "read player_results"     on public.player_results     for select using (true);
create policy "read hero_bonuses"       on public.hero_bonuses       for select using (true);
create policy "read score_overrides"    on public.score_overrides    for select using (true);
