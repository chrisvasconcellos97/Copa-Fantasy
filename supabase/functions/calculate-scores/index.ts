import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WIN_PTS  = 3;
const DRAW_PTS = 1;

const PLAYER_POINTS: Record<string, number> = {
  goal:         8,
  assist:       5,
  yellow_card:  -1,
  red_card:     -4,
  own_goal:     -3,
  penalty_save: 10,
};

const CLEAN_SHEET: Record<string, number> = { GK: 12, DEF: 8 };

const BRACE_BONUS       = 10;
const HAT_TRICK_BONUS   = 25;
const DBL_ASSIST_BONUS  = 8;
const WIN_GROUP_BONUS   = 15;
const QUALIFY_BONUS     = 10;
const THIRD_PLACE_BONUS = 5;
const UPSET_BONUS       = 8;
const GOLDEN_BOOT_BONUS = 30;
const CAPTAIN_MULTIPLIER = 2;

async function fetchGroupStandings(): Promise<Map<string, number>> {
  try {
    const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/standings');
    if (!res.ok) return new Map();
    const data = await res.json() as { children?: Array<{ standings?: { entries?: Array<{ team: { id: string }; stats?: Array<{ name: string; value: number }> }> } }> };
    const rankMap = new Map<string, number>();
    for (const group of data.children ?? []) {
      const entries = group.standings?.entries ?? [];
      entries.forEach((entry, idx) => {
        rankMap.set(entry.team.id, idx + 1);
      });
    }
    return rankMap;
  } catch { return new Map(); }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const { game_id } = await req.json().catch(() => ({})) as { game_id?: string };
  if (!game_id) return new Response(JSON.stringify({ error: 'game_id required' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const [{ data: fixtures }, { data: draftPicks }, { data: playerPicks }, { data: events }, { data: teamsData }, { data: remainingFixtures }, groupRanks] = await Promise.all([
    supabase.from('fixtures').select('api_id, round, home_team_api_id, away_team_api_id, home_goals, away_goals, winner_api_id').eq('status_short', 'FT'),
    supabase.from('draft_picks').select('id, game_player_id, team_api_id').eq('game_id', game_id),
    supabase.from('player_picks').select('id, game_player_id, player_api_id, draft_pick_id').eq('game_id', game_id),
    supabase.from('match_events').select('fixture_api_id, player_api_id, type'),
    supabase.from('teams').select('api_id, pot'),
    supabase.from('fixtures').select('api_id').neq('status_short', 'FT').limit(1),
    fetchGroupStandings(),
  ]);

  if (!fixtures || !draftPicks) return new Response(JSON.stringify({ error: 'Failed to load data' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });

  // Only award golden boot when the tournament is fully complete
  const tournamentComplete = !remainingFixtures || remainingFixtures.length === 0;

  const teamPot: Record<string, number> = {};
  for (const t of teamsData ?? []) teamPot[String(t.api_id)] = t.pot;

  const pickedPlayerIds = [...new Set((playerPicks ?? []).map(p => String(p.player_api_id)))];
  const { data: playerData } = pickedPlayerIds.length > 0
    ? await supabase.from('players').select('api_id, position, team_api_id').in('api_id', pickedPlayerIds)
    : { data: [] };

  const playerInfo: Record<string, { position: string; teamApiId: string }> = {};
  for (const p of playerData ?? []) playerInfo[String(p.api_id)] = { position: p.position, teamApiId: String(p.team_api_id) };

  const draftPickTeam: Record<string, string> = {};
  for (const dp of draftPicks ?? []) draftPickTeam[dp.id] = String(dp.team_api_id);

  const playerTeams: Record<string, Set<string>> = {};
  for (const dp of draftPicks ?? []) {
    if (!playerTeams[dp.game_player_id]) playerTeams[dp.game_player_id] = new Set();
    playerTeams[dp.game_player_id].add(String(dp.team_api_id));
  }

  const playerPlayers: Record<string, Set<string>> = {};
  const playerPickTeam: Record<string, Record<string, string>> = {};
  for (const pp of playerPicks ?? []) {
    if (!playerPlayers[pp.game_player_id]) playerPlayers[pp.game_player_id] = new Set();
    playerPlayers[pp.game_player_id].add(String(pp.player_api_id));
    if (!playerPickTeam[pp.game_player_id]) playerPickTeam[pp.game_player_id] = {};
    playerPickTeam[pp.game_player_id][String(pp.player_api_id)] = draftPickTeam[pp.draft_pick_id] ?? '';
  }

  const breakdown: Record<string, Record<string, number>> = {};
  function add(gpId: string, key: string, pts: number) {
    if (!breakdown[gpId]) breakdown[gpId] = {};
    breakdown[gpId][key] = (breakdown[gpId][key] ?? 0) + pts;
  }

  // ── Captain doubling ───────────────────────────────────────────────────
  // A player's captain is one of their player_picks. We award the captain the
  // extra (x1) copy of every player-derived point as a single captain_bonus.
  const pickIdToPlayer: Record<string, string> = {};
  for (const pp of playerPicks ?? []) pickIdToPlayer[pp.id] = String(pp.player_api_id);
  const { data: captainRows } = await supabase
    .from('captain_picks')
    .select('game_player_id, player_pick_id')
    .eq('game_id', game_id);
  const captainPlayer: Record<string, string> = {};
  for (const c of captainRows ?? []) {
    const pId = pickIdToPlayer[c.player_pick_id];
    if (pId) captainPlayer[c.game_player_id] = pId;
  }
  const captainBonus: Record<string, number> = {};
  function addCaptain(gpId: string, pId: string, pts: number) {
    if (captainPlayer[gpId] === pId) {
      captainBonus[gpId] = (captainBonus[gpId] ?? 0) + pts * (CAPTAIN_MULTIPLIER - 1);
    }
  }

  // ── Team result points: 3 win / 1 draw / 0 loss ────────────────────────
  for (const fix of fixtures ?? []) {
    const homeId = String(fix.home_team_api_id);
    const awayId = String(fix.away_team_api_id);
    const isDraw = fix.home_goals === fix.away_goals;
    const winnerId = fix.winner_api_id ? String(fix.winner_api_id) : null;
    const loserId = winnerId ? (winnerId === homeId ? awayId : homeId) : null;

    if (fix.round === 'group-stage' && winnerId) {
      const winnerPot = teamPot[winnerId] ?? 0;
      const loserPot = teamPot[loserId ?? ''] ?? 0;
      if (winnerPot >= 4 && loserPot <= 1) {
        for (const [gpId, teams] of Object.entries(playerTeams)) {
          if (teams.has(winnerId)) add(gpId, `upset_${fix.api_id}`, UPSET_BONUS);
        }
      }
    }

    for (const [gpId, teams] of Object.entries(playerTeams)) {
      const hasHome = teams.has(homeId);
      const hasAway = teams.has(awayId);
      if (!hasHome && !hasAway) continue;
      const key = `fix_${fix.api_id}`;
      if (isDraw) {
        add(gpId, key, DRAW_PTS);
      } else if (winnerId) {
        if ((hasHome && winnerId === homeId) || (hasAway && winnerId === awayId)) {
          add(gpId, key, WIN_PTS);
        }
      }
    }

    const csTeams: string[] = [];
    if ((fix.away_goals ?? 1) === 0) csTeams.push(homeId);
    if ((fix.home_goals ?? 1) === 0) csTeams.push(awayId);
    for (const csTeamId of csTeams) {
      for (const [gpId, picks] of Object.entries(playerPickTeam)) {
        for (const [pId, pickedForTeam] of Object.entries(picks)) {
          if (pickedForTeam !== csTeamId) continue;
          const csPts = CLEAN_SHEET[playerInfo[pId]?.position ?? ''];
          if (csPts) { add(gpId, `cs_${pId}_fix${fix.api_id}`, csPts); addCaptain(gpId, pId, csPts); }
        }
      }
    }
  }

  // ── Group stage bonuses ────────────────────────────────────────────────
  if (groupRanks.size > 0) {
    for (const [espnTeamId, rank] of groupRanks) {
      if (rank > 3) continue;
      const bonus = rank === 1 ? WIN_GROUP_BONUS : rank === 2 ? QUALIFY_BONUS : THIRD_PLACE_BONUS;
      for (const [gpId, teams] of Object.entries(playerTeams)) {
        if (teams.has(espnTeamId)) add(gpId, `group_finish_${espnTeamId}_r${rank}`, bonus);
      }
    }
  }

  // ── Player event points ────────────────────────────────────────────────
  const goalsByPlayerFixture: Record<string, number> = {};
  const assistsByPlayerFixture: Record<string, number> = {};
  const goalsByPlayer: Record<string, number> = {};

  for (const ev of events ?? []) {
    const evPts = PLAYER_POINTS[ev.type];
    if (evPts === undefined) continue;
    const pId = String(ev.player_api_id);
    const fixKey = `${pId}_${ev.fixture_api_id}`;

    for (const [gpId, myPlayers] of Object.entries(playerPlayers)) {
      if (!myPlayers.has(pId)) continue;
      add(gpId, `player_${pId}_${ev.type}_fix${ev.fixture_api_id}`, evPts);
      addCaptain(gpId, pId, evPts);
    }

    if (ev.type === 'goal') {
      goalsByPlayerFixture[fixKey] = (goalsByPlayerFixture[fixKey] ?? 0) + 1;
      goalsByPlayer[pId] = (goalsByPlayer[pId] ?? 0) + 1;
    }
    if (ev.type === 'assist') {
      assistsByPlayerFixture[fixKey] = (assistsByPlayerFixture[fixKey] ?? 0) + 1;
    }
  }

  for (const [fixKey, count] of Object.entries(goalsByPlayerFixture)) {
    if (count < 2) continue;
    const [pId] = fixKey.split('_');
    for (const [gpId, myPlayers] of Object.entries(playerPlayers)) {
      if (!myPlayers.has(pId)) continue;
      add(gpId, `brace_${fixKey}`, BRACE_BONUS);
      addCaptain(gpId, pId, BRACE_BONUS);
      if (count >= 3) { add(gpId, `hattrick_${fixKey}`, HAT_TRICK_BONUS); addCaptain(gpId, pId, HAT_TRICK_BONUS); }
    }
  }

  for (const [fixKey, count] of Object.entries(assistsByPlayerFixture)) {
    if (count < 2) continue;
    const [pId] = fixKey.split('_');
    for (const [gpId, myPlayers] of Object.entries(playerPlayers)) {
      if (!myPlayers.has(pId)) continue;
      add(gpId, `dbl_assist_${fixKey}`, DBL_ASSIST_BONUS);
      addCaptain(gpId, pId, DBL_ASSIST_BONUS);
    }
  }

  // ── Golden Boot — only awarded when tournament is complete ─────────────
  const maxGoals = Math.max(0, ...Object.values(goalsByPlayer));
  if (tournamentComplete && maxGoals > 0) {
    const topScorers = Object.entries(goalsByPlayer).filter(([, g]) => g === maxGoals).map(([id]) => id);
    for (const scorerId of topScorers) {
      for (const [gpId, myPlayers] of Object.entries(playerPlayers)) {
        if (myPlayers.has(scorerId)) { add(gpId, `golden_boot_${scorerId}`, GOLDEN_BOOT_BONUS); addCaptain(gpId, scorerId, GOLDEN_BOOT_BONUS); }
      }
    }
  }

  // Fold the captain bonus into each breakdown so it counts toward the total.
  for (const [gpId, bonus] of Object.entries(captainBonus)) {
    if (bonus) add(gpId, 'captain_bonus', bonus);
  }

  // ── Upsert scores ──────────────────────────────────────────────────────
  const allGpIds = new Set([...Object.keys(playerTeams), ...Object.keys(playerPlayers)]);
  let updated = 0;
  for (const gpId of allGpIds) {
    const bd = breakdown[gpId] ?? {};
    const total = Object.values(bd).reduce((a, b) => a + b, 0);
    const { error } = await supabase.from('user_scores').upsert({
      game_id,
      game_player_id: gpId,
      total_points: total,
      captain_bonus: captainBonus[gpId] ?? 0,
      breakdown: bd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'game_id,game_player_id' });
    if (!error) updated++;
  }

  return new Response(JSON.stringify({
    success: true,
    fixtures_processed: fixtures?.length ?? 0,
    events_processed: events?.length ?? 0,
    golden_boot_goals: maxGoals,
    tournament_complete: tournamentComplete,
    players_updated: updated,
  }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
});
