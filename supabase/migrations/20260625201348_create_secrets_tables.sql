-- Phase 1 (additive): move the app's only credentials out of client-readable tables.
--
-- Today game_players.token and games.host_token are selectable by anyone with
-- the anon key, so every "host-only"/"your turn" check is trivially bypassable.
-- Copy those secrets into dedicated tables that have RLS enabled and NO policies,
-- so only the service role (the JWT issuer and SECURITY DEFINER RPCs) can read
-- them.
--
-- This migration is ADDITIVE and safe to deploy on its own: the original columns
-- remain in place until the final drop_secret_columns migration, so the running
-- app keeps working throughout the rollout.

create table if not exists public.player_secrets (
  game_player_id uuid primary key references public.game_players(id) on delete cascade,
  token text not null unique
);

create table if not exists public.game_secrets (
  game_id uuid primary key references public.games(id) on delete cascade,
  host_token text not null
);

-- Backfill from the existing columns.
insert into public.player_secrets (game_player_id, token)
  select id, token from public.game_players
  where token is not null
  on conflict (game_player_id) do nothing;

insert into public.game_secrets (game_id, host_token)
  select id, host_token from public.games
  where host_token is not null
  on conflict (game_id) do nothing;

-- RLS enabled with no policies => anon/authenticated cannot read these rows.
-- The service role bypasses RLS, so the JWT issuer and RPCs can still use them.
alter table public.player_secrets enable row level security;
alter table public.game_secrets   enable row level security;
