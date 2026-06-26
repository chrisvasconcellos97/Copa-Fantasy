-- Phase 2 (additive): game-lifecycle RPCs.
--
-- These let the browser create / join / rejoin games and let the host manage the
-- lobby and advance phases WITHOUT writing games / game_players directly, so
-- those tables can later be locked down with RLS (no client write policies).
--
-- All functions are SECURITY DEFINER (run as owner, bypassing RLS). Host actions
-- validate the caller's JWT claims (player_id / is_host / game_id) minted by the
-- auth-issue edge function.
--
-- ADDITIVE: direct table writes still work until the enable_rls_* migrations run,
-- so deploying this on its own changes nothing observable. During the transition
-- these functions write BOTH the legacy secret columns (game_players.token,
-- games.host_token) AND the new secret tables, so old and new client code both
-- work. The drop_secret_columns migration recreates them without the legacy
-- columns.

-- ── JWT claim helpers ──────────────────────────────────────────────────────
create or replace function public.jwt_player_id() returns uuid
  language sql stable as $$ select nullif(auth.jwt() ->> 'player_id', '')::uuid $$;
create or replace function public.jwt_game_id() returns uuid
  language sql stable as $$ select nullif(auth.jwt() ->> 'game_id', '')::uuid $$;
create or replace function public.jwt_is_host() returns boolean
  language sql stable as $$ select coalesce((auth.jwt() ->> 'is_host')::boolean, false) $$;

-- ── Unique 6-char join code (no ambiguous chars) ───────────────────────────
create or replace function public.gen_join_code() returns text
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.games where join_code = code);
  end loop;
  return code;
end $$;

-- ── create_game ────────────────────────────────────────────────────────────
create or replace function public.create_game(
  p_host_name text,
  p_teams_per_player int default 8,
  p_players_per_team int default 3
) returns json
language plpgsql security definer set search_path = public as $$
declare
  v_game public.games;
  v_player public.game_players;
  v_host_token text := gen_random_uuid()::text;
  v_player_token text := gen_random_uuid()::text;
begin
  if coalesce(trim(p_host_name), '') = '' then raise exception 'host name required'; end if;

  insert into public.games (status, host_token, join_code, teams_per_player, players_per_team)
    values ('lobby', v_host_token, public.gen_join_code(), p_teams_per_player, p_players_per_team)
    returning * into v_game;

  insert into public.game_players (game_id, player_name, is_host, token)
    values (v_game.id, trim(p_host_name), true, v_player_token)
    returning * into v_player;

  insert into public.game_secrets (game_id, host_token) values (v_game.id, v_host_token)
    on conflict (game_id) do update set host_token = excluded.host_token;
  insert into public.player_secrets (game_player_id, token) values (v_player.id, v_player_token)
    on conflict (game_player_id) do update set token = excluded.token;

  return json_build_object(
    'game_id', v_game.id, 'join_code', v_game.join_code,
    'player_id', v_player.id, 'player_token', v_player_token, 'is_host', true);
end $$;

-- ── join_game (lobby only) ─────────────────────────────────────────────────
create or replace function public.join_game(p_join_code text, p_player_name text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_game public.games;
  v_player public.game_players;
  v_token text := gen_random_uuid()::text;
begin
  if coalesce(trim(p_player_name), '') = '' then raise exception 'name required'; end if;
  select * into v_game from public.games where join_code = upper(trim(p_join_code));
  if v_game.id is null then raise exception 'Game not found'; end if;
  if v_game.status <> 'lobby' then raise exception 'This game has already started.'; end if;

  insert into public.game_players (game_id, player_name, is_host, token)
    values (v_game.id, trim(p_player_name), false, v_token)
    returning * into v_player;
  insert into public.player_secrets (game_player_id, token) values (v_player.id, v_token)
    on conflict (game_player_id) do update set token = excluded.token;

  return json_build_object(
    'game_id', v_game.id, 'player_id', v_player.id, 'player_token', v_token, 'is_host', false);
end $$;

-- ── rejoin_lookup: return a player's token by game code + name ──────────────
-- Mirrors the existing (intentionally lenient) rejoin-by-name UX. NOTE: this is
-- a pre-existing weakness — anyone who knows the code and a player's name can
-- recover that player's session. Kept for parity; harden later if desired.
create or replace function public.rejoin_lookup(p_join_code text, p_player_name text)
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_game public.games;
  v_player public.game_players;
  v_token text;
begin
  select * into v_game from public.games where join_code = upper(trim(p_join_code));
  if v_game.id is null then raise exception 'Game not found'; end if;

  select * into v_player from public.game_players
    where game_id = v_game.id and lower(player_name) = lower(trim(p_player_name))
    order by created_at limit 1;
  if v_player.id is null then raise exception 'No player with that name found in this game'; end if;

  select token into v_token from public.player_secrets where game_player_id = v_player.id;
  if v_token is null then v_token := v_player.token; end if; -- legacy fallback

  return json_build_object(
    'game_id', v_game.id, 'player_id', v_player.id, 'player_token', v_token,
    'is_host', v_player.is_host, 'status', v_game.status);
end $$;

-- ── advance_phase (host only) ──────────────────────────────────────────────
create or replace function public.advance_phase(p_game_id uuid, p_status text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.jwt_is_host() or public.jwt_game_id() <> p_game_id then
    raise exception 'not authorized';
  end if;
  if p_status not in ('lobby','drafting_teams','selecting_players','selecting_captain','tournament','complete') then
    raise exception 'invalid status';
  end if;
  update public.games set status = p_status where id = p_game_id;
end $$;

-- ── rename_player (host only) ──────────────────────────────────────────────
create or replace function public.rename_player(p_game_player_id uuid, p_new_name text)
returns void
language plpgsql security definer set search_path = public as $$
declare v_gid uuid;
begin
  if coalesce(trim(p_new_name), '') = '' then raise exception 'name required'; end if;
  select game_id into v_gid from public.game_players where id = p_game_player_id;
  if not public.jwt_is_host() or public.jwt_game_id() <> v_gid then raise exception 'not authorized'; end if;
  update public.game_players set player_name = trim(p_new_name) where id = p_game_player_id;
end $$;

-- ── boot_player (host only) ────────────────────────────────────────────────
create or replace function public.boot_player(p_game_player_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_gid uuid; v_is_host boolean;
begin
  select game_id, is_host into v_gid, v_is_host from public.game_players where id = p_game_player_id;
  if not public.jwt_is_host() or public.jwt_game_id() <> v_gid then raise exception 'not authorized'; end if;
  if v_is_host then raise exception 'cannot remove the host'; end if;
  delete from public.game_players where id = p_game_player_id;
end $$;

-- ── split_group (host only): move players into a new linked game ───────────
create or replace function public.split_group(p_game_id uuid, p_move_player_ids uuid[])
returns json
language plpgsql security definer set search_path = public as $$
declare
  v_game public.games;
  v_game_b public.games;
  v_host_token text;
begin
  if not public.jwt_is_host() or public.jwt_game_id() <> p_game_id then raise exception 'not authorized'; end if;
  select * into v_game from public.games where id = p_game_id;
  if v_game.id is null then raise exception 'Game not found'; end if;
  if exists (select 1 from public.game_players where id = any(p_move_player_ids) and is_host) then
    raise exception 'the host must stay in Group A';
  end if;

  select host_token into v_host_token from public.game_secrets where game_id = p_game_id;
  if v_host_token is null then v_host_token := v_game.host_token; end if;

  insert into public.games (status, host_token, join_code, teams_per_player, players_per_team, linked_game_id)
    values ('lobby', v_host_token, public.gen_join_code(),
            coalesce(v_game.teams_per_player, 8), coalesce(v_game.players_per_team, 3), p_game_id)
    returning * into v_game_b;

  insert into public.game_secrets (game_id, host_token) values (v_game_b.id, v_host_token)
    on conflict (game_id) do update set host_token = excluded.host_token;

  update public.games set linked_game_id = v_game_b.id where id = p_game_id;
  update public.game_players set game_id = v_game_b.id, is_host = false where id = any(p_move_player_ids);

  return json_build_object('group_b_game_id', v_game_b.id, 'join_code', v_game_b.join_code);
end $$;

-- Entry points are callable by anon (they are how a client gets a JWT); host
-- ops require a JWT and self-check the claims.
grant execute on function public.create_game(text,int,int)        to anon, authenticated;
grant execute on function public.join_game(text,text)             to anon, authenticated;
grant execute on function public.rejoin_lookup(text,text)         to anon, authenticated;
grant execute on function public.advance_phase(uuid,text)         to authenticated;
grant execute on function public.rename_player(uuid,text)         to authenticated;
grant execute on function public.boot_player(uuid)                to authenticated;
grant execute on function public.split_group(uuid,uuid[])         to authenticated;
