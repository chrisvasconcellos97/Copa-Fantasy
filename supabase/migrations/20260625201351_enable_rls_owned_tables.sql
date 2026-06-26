-- Phase 4: enable RLS on the player-owned / draft / scores / notifications tables.
--
-- ⚠️  THIS IS THE PHASE THAT CLOSES THE HOLE — and the one that can take the app
-- offline if the client still writes these tables directly. Apply ONLY AFTER the
-- client is wired to attach the per-player JWT and to call the RPCs from phases
-- 2–3 (see SECURITY_PLAN.md, task 5). Each table is reversible with
-- `alter table ... disable row level security`.
--
-- Ownership is checked via the JWT claim player_id (= game_players.id), read by
-- public.jwt_player_id().

-- player_picks: everyone in the game may read; you may write only your own.
alter table public.player_picks enable row level security;
create policy "read player_picks"  on public.player_picks for select using (true);
create policy "write own player_picks" on public.player_picks
  for all using (game_player_id = public.jwt_player_id())
  with check (game_player_id = public.jwt_player_id());

-- captain_picks: same shape.
alter table public.captain_picks enable row level security;
create policy "read captain_picks"  on public.captain_picks for select using (true);
create policy "write own captain_picks" on public.captain_picks
  for all using (game_player_id = public.jwt_player_id())
  with check (game_player_id = public.jwt_player_id());

-- substitutions: same shape.
alter table public.substitutions enable row level security;
create policy "read substitutions"  on public.substitutions for select using (true);
create policy "write own substitutions" on public.substitutions
  for all using (game_player_id = public.jwt_player_id())
  with check (game_player_id = public.jwt_player_id());

-- draft_picks: read-only to clients; inserted only via make_draft_pick RPC
-- (turn order can't be expressed safely in RLS) or the service role.
alter table public.draft_picks enable row level security;
create policy "read draft_picks" on public.draft_picks for select using (true);

-- user_scores: read-only to clients; written only by host RPCs / the engine.
alter table public.user_scores enable row level security;
create policy "read user_scores" on public.user_scores for select using (true);

-- notifications: you read your own; anyone in the game may create one (poke);
-- you may update your own (mark read).
alter table public.notifications enable row level security;
create policy "read own notifications" on public.notifications
  for select using (game_player_id = public.jwt_player_id());
create policy "create notifications in game" on public.notifications
  for insert with check (game_id = public.jwt_game_id());
create policy "update own notifications" on public.notifications
  for update using (game_player_id = public.jwt_player_id())
  with check (game_player_id = public.jwt_player_id());
