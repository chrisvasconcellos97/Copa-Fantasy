-- Phase 3 (additive): gameplay & host-scoring write RPCs.
--
-- draft_picks needs a turn-order check that RLS can't express, and user_scores
-- must only ever be written by the host (or the scoring engine, which uses the
-- service role). These SECURITY DEFINER functions move those writes server-side
-- so the tables can be made select-only for clients.
--
-- ADDITIVE: deploying this alone changes nothing until the enable_rls_* migrations
-- remove the direct-write paths.

-- ── make_draft_pick: insert the caller's draft pick, enforcing snake turn order ──
-- ASSUMPTION: the picking order is game_players ordered by (draft_order nulls
-- last, created_at) — this MUST match the order the client renders. Snake order:
-- forward on even rounds (0-indexed), reverse on odd rounds.
create or replace function public.make_draft_pick(
  p_game_id uuid,
  p_pot int,
  p_team_code text,
  p_team_api_id int default null
) returns public.draft_picks
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := public.jwt_player_id();
  v_game public.games;
  v_n int;            -- player count
  v_count int;        -- picks so far
  v_round int;
  v_pos int;
  v_expected uuid;    -- whose turn it is
  v_pick public.draft_picks;
begin
  if v_me is null or public.jwt_game_id() <> p_game_id then raise exception 'not authorized'; end if;
  select * into v_game from public.games where id = p_game_id;
  if v_game.id is null then raise exception 'Game not found'; end if;
  if v_game.status <> 'drafting_teams' then raise exception 'not in the team-draft phase'; end if;

  -- Team can't already be taken in this game.
  if exists (
    select 1 from public.draft_picks
    where game_id = p_game_id
      and ((p_team_api_id is not null and team_api_id = p_team_api_id) or team_code = p_team_code)
  ) then raise exception 'team already taken'; end if;

  select count(*) into v_n from public.game_players where game_id = p_game_id;
  select count(*) into v_count from public.draft_picks where game_id = p_game_id;
  v_round := v_count / v_n;
  v_pos := v_count % v_n;
  if v_round % 2 = 1 then v_pos := v_n - 1 - v_pos; end if;

  select id into v_expected from public.game_players
    where game_id = p_game_id
    order by draft_order nulls last, created_at
    offset v_pos limit 1;

  if v_expected <> v_me then raise exception 'not your turn'; end if;

  insert into public.draft_picks (game_id, game_player_id, pick_number, pot, team_code, team_api_id)
    values (p_game_id, v_me, v_count + 1, p_pot, p_team_code, p_team_api_id)
    returning * into v_pick;
  return v_pick;
end $$;

-- ── Host scoring writes ────────────────────────────────────────────────────
-- NOTE: these mirror the existing host panel, which edits user_scores.breakdown
-- directly. The scoring engine (calculate-scores / auto-sync) REWRITES the whole
-- breakdown on recalc and will overwrite these manual keys. That overwrite is a
-- known issue to be reconciled by moving manual adjustments into additive tables
-- (team_results / score_overrides); these RPCs preserve current behaviour so the
-- host panel keeps working once RLS locks user_scores.

create or replace function public._assert_host(p_game_id uuid) returns void
language plpgsql stable as $$
begin
  if not public.jwt_is_host() or public.jwt_game_id() <> p_game_id then
    raise exception 'host only';
  end if;
end $$;

-- Recompute total = sum of numeric values in the breakdown.
create or replace function public._breakdown_total(p_bd jsonb) returns int
language sql immutable as $$
  select coalesce(sum((value)::numeric)::int, 0)
  from jsonb_each_text(p_bd)
  where value ~ '^-?[0-9]+(\.[0-9]+)?$'
$$;

create or replace function public.add_team_result(
  p_game_id uuid, p_team_api_id int, p_result_type text, p_points int
) returns void
language plpgsql security definer set search_path = public as $$
declare v_gp uuid; v_bd jsonb; v_key text := 'team_' || p_team_api_id || '_' || p_result_type;
begin
  perform public._assert_host(p_game_id);
  for v_gp in
    select distinct game_player_id from public.draft_picks
    where game_id = p_game_id and team_api_id = p_team_api_id
  loop
    select coalesce(breakdown, '{}'::jsonb) into v_bd from public.user_scores
      where game_id = p_game_id and game_player_id = v_gp;
    v_bd := coalesce(v_bd, '{}'::jsonb);
    v_bd := jsonb_set(v_bd, array[v_key], to_jsonb(coalesce((v_bd ->> v_key)::int, 0) + p_points));
    insert into public.user_scores (game_id, game_player_id, total_points, breakdown, updated_at)
      values (p_game_id, v_gp, public._breakdown_total(v_bd), v_bd, now())
      on conflict (game_id, game_player_id)
      do update set breakdown = excluded.breakdown, total_points = excluded.total_points, updated_at = now();
  end loop;
end $$;

create or replace function public.add_bonus(
  p_game_id uuid, p_game_player_id uuid, p_points int, p_desc text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare v_bd jsonb; v_key text := 'bonus_' || extract(epoch from clock_timestamp())::bigint;
begin
  perform public._assert_host(p_game_id);
  select coalesce(breakdown, '{}'::jsonb) into v_bd from public.user_scores
    where game_id = p_game_id and game_player_id = p_game_player_id;
  v_bd := coalesce(v_bd, '{}'::jsonb);
  v_bd := jsonb_set(v_bd, array[v_key], to_jsonb(p_points));
  if p_desc is not null and p_desc <> '' then
    v_bd := jsonb_set(v_bd, array[v_key || '_desc'], to_jsonb(p_desc));
  end if;
  insert into public.user_scores (game_id, game_player_id, total_points, breakdown, updated_at)
    values (p_game_id, p_game_player_id, public._breakdown_total(v_bd), v_bd, now())
    on conflict (game_id, game_player_id)
    do update set breakdown = excluded.breakdown, total_points = excluded.total_points, updated_at = now();
end $$;

create or replace function public.override_score(
  p_game_id uuid, p_game_player_id uuid, p_total int
) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public._assert_host(p_game_id);
  insert into public.user_scores (game_id, game_player_id, total_points, breakdown, updated_at)
    values (p_game_id, p_game_player_id, p_total, jsonb_build_object('override', p_total), now())
    on conflict (game_id, game_player_id)
    do update set breakdown = jsonb_build_object('override', p_total), total_points = p_total, updated_at = now();
end $$;

grant execute on function public.make_draft_pick(uuid,int,text,int)        to authenticated;
grant execute on function public.add_team_result(uuid,int,text,int)        to authenticated;
grant execute on function public.add_bonus(uuid,uuid,int,text)             to authenticated;
grant execute on function public.override_score(uuid,uuid,int)             to authenticated;
