-- Phase 6 (final): drop the client-readable secret columns.
--
-- ⚠️  Apply LAST, only after phases 1–5 are live, the client no longer SELECTs
-- game_players.token / games.host_token, and the auth-issue + lifecycle RPCs are
-- confirmed working against the player_secrets / game_secrets tables. After this,
-- the only place tokens exist is the RLS-locked secret tables.
--
-- The lifecycle functions from phase 2 wrote BOTH the legacy columns and the
-- secret tables; we recreate them here to use the secret tables only, then drop
-- the columns.

-- create_game (secret tables only)
create or replace function public.create_game(
  p_host_name text, p_teams_per_player int default 8, p_players_per_team int default 3
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_game public.games; v_player public.game_players;
  v_host_token text := gen_random_uuid()::text;
  v_player_token text := gen_random_uuid()::text;
begin
  if coalesce(trim(p_host_name), '') = '' then raise exception 'host name required'; end if;
  insert into public.games (status, join_code, teams_per_player, players_per_team)
    values ('lobby', public.gen_join_code(), p_teams_per_player, p_players_per_team)
    returning * into v_game;
  insert into public.game_players (game_id, player_name, is_host)
    values (v_game.id, trim(p_host_name), true) returning * into v_player;
  insert into public.game_secrets (game_id, host_token) values (v_game.id, v_host_token);
  insert into public.player_secrets (game_player_id, token) values (v_player.id, v_player_token);
  return json_build_object('game_id', v_game.id, 'join_code', v_game.join_code,
    'player_id', v_player.id, 'player_token', v_player_token, 'is_host', true);
end $$;

-- join_game (secret table only)
create or replace function public.join_game(p_join_code text, p_player_name text)
returns json
language plpgsql security definer set search_path = public as $$
declare v_game public.games; v_player public.game_players; v_token text := gen_random_uuid()::text;
begin
  if coalesce(trim(p_player_name), '') = '' then raise exception 'name required'; end if;
  select * into v_game from public.games where join_code = upper(trim(p_join_code));
  if v_game.id is null then raise exception 'Game not found'; end if;
  if v_game.status <> 'lobby' then raise exception 'This game has already started.'; end if;
  insert into public.game_players (game_id, player_name, is_host)
    values (v_game.id, trim(p_player_name), false) returning * into v_player;
  insert into public.player_secrets (game_player_id, token) values (v_player.id, v_token);
  return json_build_object('game_id', v_game.id, 'player_id', v_player.id,
    'player_token', v_token, 'is_host', false);
end $$;

-- rejoin_lookup (secret table only)
create or replace function public.rejoin_lookup(p_join_code text, p_player_name text)
returns json
language plpgsql security definer set search_path = public as $$
declare v_game public.games; v_player public.game_players; v_token text;
begin
  select * into v_game from public.games where join_code = upper(trim(p_join_code));
  if v_game.id is null then raise exception 'Game not found'; end if;
  select * into v_player from public.game_players
    where game_id = v_game.id and lower(player_name) = lower(trim(p_player_name))
    order by created_at limit 1;
  if v_player.id is null then raise exception 'No player with that name found in this game'; end if;
  select token into v_token from public.player_secrets where game_player_id = v_player.id;
  if v_token is null then raise exception 'No session token for this player'; end if;
  return json_build_object('game_id', v_game.id, 'player_id', v_player.id,
    'player_token', v_token, 'is_host', v_player.is_host, 'status', v_game.status);
end $$;

-- split_group (game_secrets only)
create or replace function public.split_group(p_game_id uuid, p_move_player_ids uuid[])
returns json
language plpgsql security definer set search_path = public as $$
declare v_game public.games; v_game_b public.games; v_host_token text;
begin
  if not public.jwt_is_host() or public.jwt_game_id() <> p_game_id then raise exception 'not authorized'; end if;
  select * into v_game from public.games where id = p_game_id;
  if v_game.id is null then raise exception 'Game not found'; end if;
  if exists (select 1 from public.game_players where id = any(p_move_player_ids) and is_host) then
    raise exception 'the host must stay in Group A';
  end if;
  select host_token into v_host_token from public.game_secrets where game_id = p_game_id;
  insert into public.games (status, join_code, teams_per_player, players_per_team, linked_game_id)
    values ('lobby', public.gen_join_code(),
            coalesce(v_game.teams_per_player, 8), coalesce(v_game.players_per_team, 3), p_game_id)
    returning * into v_game_b;
  insert into public.game_secrets (game_id, host_token) values (v_game_b.id, v_host_token);
  update public.games set linked_game_id = v_game_b.id where id = p_game_id;
  update public.game_players set game_id = v_game_b.id, is_host = false where id = any(p_move_player_ids);
  return json_build_object('group_b_game_id', v_game_b.id, 'join_code', v_game_b.join_code);
end $$;

-- Finally, remove the exposed secret columns.
alter table public.game_players drop column if exists token;
alter table public.games        drop column if exists host_token;
