import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HL_KEY = Deno.env.get('HIGHLIGHTLY_API_KEY') ?? '49b62db5-b66e-451f-8c98-7049ef090abd';
const HL_HEADERS = { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': 'soccer.highlightly.net' };

let rateLimited = false;

function normName(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
}
function hlNameKey(name: string): string {
  const clean = normName(name);
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length < 2) return clean;
  return `${parts[0][0]}_${parts.slice(1).join(' ')}`;
}
function mapHLType(type: string): string | null {
  switch (type.toLowerCase()) {
    case 'goal': case 'penalty': return 'goal';
    case 'own goal': return 'own_goal';
    case 'yellow card': return 'yellow_card';
    case 'red card': case 'yellow red card': return 'red_card';
    default: return null;
  }
}
function mapESPNType(type: string): string | null {
  switch (type) {
    case 'goal': case 'penalty-scored': return 'goal';
    case 'own-goal': return 'own_goal';
    case 'yellow-card': return 'yellow_card';
    case 'red-card': case 'yellow-red-card': return 'red_card';
    case 'penalty-saved': return 'penalty_save';
    default: return null;
  }
}

type HLEvent = { team?: { id?: number }; time?: string; type?: string; player?: string | null; playerId?: number | null; assist?: string | null; assistingPlayerId?: number | null };
type HLMatch = { id: number; homeTeam?: { id?: number; name?: string }; awayTeam?: { id?: number; name?: string } };
type ESPNEvent = { id: string; type: { type: string; text: string }; clock: { value: number }; team?: { id: string }; participants?: Array<{ athlete: { id: string } }> };

async function fetchHLByDate(date: string): Promise<HLMatch[] | null> {
  if (rateLimited) return null;
  try {
    const r = await fetch(`https://soccer.highlightly.net/matches?date=${date}`, { headers: HL_HEADERS });
    if (!r.ok) return null;
    const d = await r.json();
    if (d?.message) { rateLimited = true; return null; }
    return (Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : []) as HLMatch[];
  } catch { return null; }
}

async function fetchHLEvents(id: number): Promise<{ events: HLEvent[]; homeTeamId?: number; awayTeamId?: number } | null> {
  if (rateLimited) return null;
  try {
    const r = await fetch(`https://soccer.highlightly.net/matches/${id}`, { headers: HL_HEADERS });
    if (!r.ok) return null;
    const d = await r.json();
    if (d?.message) { rateLimited = true; return null; }
    const match = Array.isArray(d) ? d[0] : Array.isArray(d?.data) ? d.data[0] : d;
    return { events: (match?.events ?? []) as HLEvent[], homeTeamId: match?.homeTeam?.id, awayTeamId: match?.awayTeam?.id };
  } catch { return null; }
}

async function fetchESPNEvents(fixtureApiId: number): Promise<ESPNEvent[]> {
  try {
    const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${fixtureApiId}`);
    if (!r.ok) return [];
    const d = await r.json() as { keyEvents?: ESPNEvent[] };
    return d.keyEvents ?? [];
  } catch { return []; }
}

const WIN_PTS = 3, DRAW_PTS = 1;
const PLAYER_POINTS: Record<string, number> = { goal: 8, assist: 5, yellow_card: -1, red_card: -4, own_goal: -3, penalty_save: 10 };
const CLEAN_SHEET: Record<string, number> = { GK: 12, DEF: 8 };
const BRACE_BONUS = 10, HAT_TRICK_BONUS = 25, DBL_ASSIST_BONUS = 8;
const WIN_GROUP_BONUS = 15, QUALIFY_BONUS = 10, THIRD_PLACE_BONUS = 5;
const UPSET_BONUS = 8, GOLDEN_BOOT_BONUS = 30;
const CAPTAIN_MULTIPLIER = 2;

async function fetchGroupStandings(): Promise<Map<string, number>> {
  try {
    const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/standings');
    if (!r.ok) return new Map();
    const d = await r.json() as { children?: { standings?: { entries?: { team: { id: string } }[] } }[] };
    const m = new Map<string, number>();
    for (const g of d.children ?? []) (g.standings?.entries ?? []).forEach((e, i) => m.set(e.team.id, i + 1));
    return m;
  } catch { return new Map(); }
}

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const [{ data: liveFixtures }, { data: ftFixtures }, { data: ourTeams }, { data: allPlayers }] = await Promise.all([
    supabase.from('fixtures').select('api_id,id,home_team_api_id,away_team_api_id,kickoff,hl_match_id').not('elapsed', 'is', null).neq('status_short', 'FT'),
    supabase.from('fixtures').select('api_id,id,home_team_api_id,away_team_api_id,kickoff,hl_match_id').eq('status_short', 'FT').eq('events_synced', false),
    supabase.from('teams').select('api_id,name'),
    supabase.from('players').select('api_id,name').limit(10000),
  ]);

  const keyMap = new Map<string, number>();
  const lastMap = new Map<string, number[]>();
  for (const p of allPlayers ?? []) {
    const norm = normName(p.name);
    const parts = norm.split(' ').filter(Boolean);
    keyMap.set(norm, p.api_id);
    if (parts.length >= 2) {
      keyMap.set(`${parts[0][0]}_${parts.slice(1).join(' ')}`, p.api_id);
      const last = parts[parts.length - 1];
      if (!lastMap.has(last)) lastMap.set(last, []);
      lastMap.get(last)!.push(p.api_id);
    }
  }

  function resolve(name: string | null | undefined): number | null {
    if (!name) return null;
    const norm = normName(name);
    if (keyMap.has(norm)) return keyMap.get(norm)!;
    const key = hlNameKey(name);
    if (keyMap.has(key)) return keyMap.get(key)!;
    const parts = norm.split(' ').filter(Boolean);
    const candidates = lastMap.get(parts[parts.length - 1]);
    return candidates?.length === 1 ? candidates[0] : null;
  }

  const teamByApiId = new Map<number, string>();
  for (const t of ourTeams ?? []) teamByApiId.set(t.api_id, t.name);

  // ── HL: Discover match IDs ──────────────────────────────────────────
  const needsDiscovery = [...(liveFixtures ?? []), ...(ftFixtures ?? [])].filter(f => !f.hl_match_id);
  const hlIdUpdates: { id: string; hl_match_id: number }[] = [];

  if (needsDiscovery.length > 0) {
    const byDate = new Map<string, typeof needsDiscovery>();
    for (const f of needsDiscovery) {
      const d = (f.kickoff as string).slice(0, 10);
      if (!byDate.has(d)) byDate.set(d, []);
      byDate.get(d)!.push(f);
    }
    for (const [date, fixtures] of byDate) {
      if (rateLimited) break;
      const hlMatches = await fetchHLByDate(date);
      if (!hlMatches) break;
      const hlByKey = new Map<string, HLMatch>();
      for (const m of hlMatches) {
        if (!m?.homeTeam?.name || !m?.awayTeam?.name) continue;
        hlByKey.set(`${normName(m.homeTeam.name)}|${normName(m.awayTeam.name)}`, m);
      }
      for (const f of fixtures) {
        const homeN = normName(teamByApiId.get(f.home_team_api_id) ?? '');
        const awayN = normName(teamByApiId.get(f.away_team_api_id) ?? '');
        const hlMatch = hlByKey.get(`${homeN}|${awayN}`);
        if (hlMatch && f.id) {
          f.hl_match_id = hlMatch.id;
          hlIdUpdates.push({ id: f.id as string, hl_match_id: hlMatch.id });
        }
      }
    }
    for (const upd of hlIdUpdates) {
      await supabase.from('fixtures').update({ hl_match_id: upd.hl_match_id }).eq('id', upd.id);
    }
  }

  // ── HL: Fetch events ────────────────────────────────────────────────
  const rows: Record<string, unknown>[] = [];
  const hlSyncedIds: string[] = [];
  const hlSyncedApiIds = new Set<number>();

  const allFixtures = [
    ...(liveFixtures ?? []).map(f => ({ ...f, isFT: false })),
    ...(ftFixtures ?? []).map(f => ({ ...f, isFT: true })),
  ];

  for (const f of allFixtures) {
    if (rateLimited) break;
    if (!f.hl_match_id) continue;
    const result = await fetchHLEvents(f.hl_match_id);
    if (!result) break;
    const { events, homeTeamId, awayTeamId } = result;
    if (!events.length) continue;
    const homeN = normName(teamByApiId.get(f.home_team_api_id) ?? '');
    const awayN = normName(teamByApiId.get(f.away_team_api_id) ?? '');
    const hlTeamToOurs = new Map<number, number>();
    const homeOurs = ourTeams?.find(t => normName(t.name) === homeN)?.api_id;
    const awayOurs = ourTeams?.find(t => normName(t.name) === awayN)?.api_id;
    if (homeTeamId && homeOurs) hlTeamToOurs.set(homeTeamId, homeOurs);
    if (awayTeamId && awayOurs) hlTeamToOurs.set(awayTeamId, awayOurs);
    for (const ev of events) {
      const ourType = mapHLType(ev.type ?? '');
      if (!ourType) continue;
      const playerId = resolve(ev.player);
      if (!playerId) continue;
      const t = ev.time ?? '0';
      const tClean = t.replace('+', 'p');
      const elapsed = parseInt(t.split('+')[0], 10) || null;
      const teamId = ev.team?.id ? hlTeamToOurs.get(ev.team.id) ?? null : null;
      rows.push({ fixture_api_id: f.api_id, team_api_id: teamId, player_api_id: playerId, assist_api_id: null, type: ourType, detail: ev.type, elapsed, dedupe_key: `${f.api_id}_hl_${ev.playerId ?? 0}_${ourType}_${tClean}` });
      if (ourType === 'goal' && ev.assist) {
        const assistId = resolve(ev.assist);
        if (assistId) rows.push({ fixture_api_id: f.api_id, team_api_id: teamId, player_api_id: assistId, assist_api_id: null, type: 'assist', detail: 'Assist', elapsed, dedupe_key: `${f.api_id}_hl_${ev.assistingPlayerId ?? 0}_assist_${tClean}` });
      }
    }
    if (f.isFT && f.id) { hlSyncedIds.push(f.id as string); hlSyncedApiIds.add(f.api_id as number); }
  }

  if (rows.length > 0) await supabase.from('match_events').upsert(rows, { onConflict: 'dedupe_key' });
  if (hlSyncedIds.length > 0) await supabase.from('fixtures').update({ events_synced: true }).in('id', hlSyncedIds);

  // ── ESPN: Fill gaps for FT fixtures HL couldn't cover ───────────────
  const espnRows: Record<string, unknown>[] = [];
  const espnSyncedIds: string[] = [];
  let espnFixturesChecked = 0;
  for (const f of (ftFixtures ?? []).filter(f => !hlSyncedApiIds.has(f.api_id as number))) {
    const espnEvents = await fetchESPNEvents(f.api_id as number);
    espnFixturesChecked++;
    for (const ev of espnEvents) {
      const ourType = mapESPNType(ev.type.type);
      if (!ourType) continue;
      if (!ev.participants?.length) continue;
      const primary = ev.participants[0];
      const secondary = ev.participants[1] ?? null;
      const minute = Math.floor(ev.clock.value / 60) || null;
      const teamApiId = ev.team?.id ? parseInt(ev.team.id, 10) : null;
      espnRows.push({ fixture_api_id: f.api_id, team_api_id: teamApiId, player_api_id: parseInt(primary.athlete.id, 10), assist_api_id: null, type: ourType, detail: ev.type.text, elapsed: minute, dedupe_key: `${f.api_id}_espn_${ev.id}_${ourType}` });
      if (ourType === 'goal' && secondary) espnRows.push({ fixture_api_id: f.api_id, team_api_id: teamApiId, player_api_id: parseInt(secondary.athlete.id, 10), assist_api_id: null, type: 'assist', detail: 'Assist', elapsed: minute, dedupe_key: `${f.api_id}_espn_${ev.id}_assist` });
    }
    if (f.id) espnSyncedIds.push(f.id as string);
  }
  if (espnRows.length > 0) await supabase.from('match_events').upsert(espnRows, { onConflict: 'dedupe_key' });
  if (espnSyncedIds.length > 0) await supabase.from('fixtures').update({ events_synced: true }).in('id', espnSyncedIds);

  // ── Recalculate scores ──────────────────────────────────────────────
  const { data: remaining } = await supabase.from('fixtures').select('api_id').neq('status_short', 'FT').limit(1);
  const tournamentComplete = !remaining?.length;
  const { data: activeGames } = await supabase.from('games').select('id').in('status', ['tournament', 'selecting_players']);
  const groupRanks = await fetchGroupStandings();
  let gamesUpdated = 0;

  for (const game of activeGames ?? []) {
    const gid = game.id;
    const [{ data: ftFix }, { data: draftPicks }, { data: playerPicks }, { data: events }, { data: teamsData }] = await Promise.all([
      supabase.from('fixtures').select('api_id,round,home_team_api_id,away_team_api_id,home_goals,away_goals,winner_api_id').eq('status_short', 'FT'),
      supabase.from('draft_picks').select('id,game_player_id,team_api_id').eq('game_id', gid),
      supabase.from('player_picks').select('id,game_player_id,player_api_id,draft_pick_id').eq('game_id', gid),
      supabase.from('match_events').select('fixture_api_id,player_api_id,type'),
      supabase.from('teams').select('api_id,pot'),
    ]);
    if (!ftFix || !draftPicks) continue;

    const teamPot: Record<string, number> = {};
    for (const t of teamsData ?? []) teamPot[String(t.api_id)] = t.pot;
    const pickedIds = [...new Set((playerPicks ?? []).map(p => String(p.player_api_id)))];
    const { data: pData } = pickedIds.length ? await supabase.from('players').select('api_id,position').in('api_id', pickedIds) : { data: [] };
    const playerPos: Record<string, string> = {};
    for (const p of pData ?? []) playerPos[String(p.api_id)] = p.position;

    const dpTeam: Record<string, string> = {};
    for (const dp of draftPicks) dpTeam[dp.id] = String(dp.team_api_id);
    const playerTeams: Record<string, Set<string>> = {};
    for (const dp of draftPicks) {
      if (!playerTeams[dp.game_player_id]) playerTeams[dp.game_player_id] = new Set();
      playerTeams[dp.game_player_id].add(String(dp.team_api_id));
    }
    const playerPlayers: Record<string, Set<string>> = {};
    const pickTeam: Record<string, Record<string, string>> = {};
    for (const pp of playerPicks ?? []) {
      if (!playerPlayers[pp.game_player_id]) playerPlayers[pp.game_player_id] = new Set();
      playerPlayers[pp.game_player_id].add(String(pp.player_api_id));
      if (!pickTeam[pp.game_player_id]) pickTeam[pp.game_player_id] = {};
      pickTeam[pp.game_player_id][String(pp.player_api_id)] = dpTeam[pp.draft_pick_id] ?? '';
    }

    const bd: Record<string, Record<string, number>> = {};
    const add = (gpId: string, k: string, pts: number) => { if (!bd[gpId]) bd[gpId] = {}; bd[gpId][k] = (bd[gpId][k] ?? 0) + pts; };

    // Captain doubling: each player's captain is one of their player_picks; the
    // captain earns the extra (x1) copy of every player-derived point.
    const pickIdToPlayer: Record<string, string> = {};
    for (const pp of playerPicks ?? []) pickIdToPlayer[pp.id] = String(pp.player_api_id);
    const { data: captainRows } = await supabase.from('captain_picks').select('game_player_id,player_pick_id').eq('game_id', gid);
    const captainPlayer: Record<string, string> = {};
    for (const c of captainRows ?? []) { const pId = pickIdToPlayer[c.player_pick_id]; if (pId) captainPlayer[c.game_player_id] = pId; }
    const captainBonus: Record<string, number> = {};
    const addCaptain = (gpId: string, pId: string, pts: number) => { if (captainPlayer[gpId] === pId) captainBonus[gpId] = (captainBonus[gpId] ?? 0) + pts * (CAPTAIN_MULTIPLIER - 1); };

    for (const fix of ftFix) {
      const hId = String(fix.home_team_api_id), aId = String(fix.away_team_api_id);
      const draw = fix.home_goals === fix.away_goals;
      const wId = fix.winner_api_id ? String(fix.winner_api_id) : null;
      const lId = wId ? (wId === hId ? aId : hId) : null;
      if (fix.round === 'group-stage' && wId && (teamPot[wId] ?? 0) >= 4 && (teamPot[lId ?? ''] ?? 0) <= 1)
        for (const [gpId, teams] of Object.entries(playerTeams)) if (teams.has(wId)) add(gpId, `upset_${fix.api_id}`, UPSET_BONUS);
      for (const [gpId, teams] of Object.entries(playerTeams)) {
        const h = teams.has(hId), a = teams.has(aId);
        if (!h && !a) continue;
        if (draw) add(gpId, `fix_${fix.api_id}`, DRAW_PTS);
        else if (wId && ((h && wId === hId) || (a && wId === aId))) add(gpId, `fix_${fix.api_id}`, WIN_PTS);
      }
      if ((fix.away_goals ?? 1) === 0) for (const [gpId, picks] of Object.entries(pickTeam)) for (const [pId, t] of Object.entries(picks)) { if (t !== hId) continue; const cs = CLEAN_SHEET[playerPos[pId] ?? '']; if (cs) { add(gpId, `cs_${pId}_fix${fix.api_id}`, cs); addCaptain(gpId, pId, cs); } }
      if ((fix.home_goals ?? 1) === 0) for (const [gpId, picks] of Object.entries(pickTeam)) for (const [pId, t] of Object.entries(picks)) { if (t !== aId) continue; const cs = CLEAN_SHEET[playerPos[pId] ?? '']; if (cs) { add(gpId, `cs_${pId}_fix${fix.api_id}`, cs); addCaptain(gpId, pId, cs); } }
    }

    // Group qualification bonuses: 1st=15, 2nd=10, 3rd=5
    if (groupRanks.size > 0)
      for (const [tid, rank] of groupRanks) {
        if (rank > 3) continue;
        const bonus = rank === 1 ? WIN_GROUP_BONUS : rank === 2 ? QUALIFY_BONUS : THIRD_PLACE_BONUS;
        for (const [gpId, teams] of Object.entries(playerTeams)) if (teams.has(tid)) add(gpId, `group_finish_${tid}_r${rank}`, bonus);
      }

    const gPF: Record<string, number> = {}, aPF: Record<string, number> = {}, gP: Record<string, number> = {};
    for (const ev of events ?? []) {
      const pts = PLAYER_POINTS[ev.type]; if (pts === undefined) continue;
      const pId = String(ev.player_api_id);
      for (const [gpId, mp] of Object.entries(playerPlayers)) if (mp.has(pId)) { add(gpId, `player_${pId}_${ev.type}_fix${ev.fixture_api_id}`, pts); addCaptain(gpId, pId, pts); }
      if (ev.type === 'goal') { gPF[`${pId}_${ev.fixture_api_id}`] = (gPF[`${pId}_${ev.fixture_api_id}`] ?? 0) + 1; gP[pId] = (gP[pId] ?? 0) + 1; }
      if (ev.type === 'assist') aPF[`${pId}_${ev.fixture_api_id}`] = (aPF[`${pId}_${ev.fixture_api_id}`] ?? 0) + 1;
    }
    for (const [fk, cnt] of Object.entries(gPF)) {
      if (cnt < 2) continue;
      const [pId] = fk.split('_');
      for (const [gpId, mp] of Object.entries(playerPlayers)) if (mp.has(pId)) { add(gpId, `brace_${fk}`, BRACE_BONUS); addCaptain(gpId, pId, BRACE_BONUS); if (cnt >= 3) { add(gpId, `hattrick_${fk}`, HAT_TRICK_BONUS); addCaptain(gpId, pId, HAT_TRICK_BONUS); } }
    }
    for (const [fk, cnt] of Object.entries(aPF)) { if (cnt < 2) continue; const [pId] = fk.split('_'); for (const [gpId, mp] of Object.entries(playerPlayers)) if (mp.has(pId)) { add(gpId, `dbl_assist_${fk}`, DBL_ASSIST_BONUS); addCaptain(gpId, pId, DBL_ASSIST_BONUS); } }
    const maxG = Math.max(0, ...Object.values(gP));
    if (tournamentComplete && maxG > 0) for (const [sid, g] of Object.entries(gP)) if (g === maxG) for (const [gpId, mp] of Object.entries(playerPlayers)) if (mp.has(sid)) { add(gpId, `golden_boot_${sid}`, GOLDEN_BOOT_BONUS); addCaptain(gpId, sid, GOLDEN_BOOT_BONUS); }

    for (const [gpId, bonus] of Object.entries(captainBonus)) { if (bonus) add(gpId, 'captain_bonus', bonus); }
    for (const gpId of new Set([...Object.keys(playerTeams), ...Object.keys(playerPlayers)])) {
      const b = bd[gpId] ?? {};
      const total = Object.values(b).reduce((a, v) => a + v, 0);
      await supabase.from('user_scores').upsert({ game_id: gid, game_player_id: gpId, total_points: total, captain_bonus: captainBonus[gpId] ?? 0, breakdown: b, updated_at: new Date().toISOString() }, { onConflict: 'game_id,game_player_id' });
    }
    gamesUpdated++;
  }

  return new Response(JSON.stringify({
    success: true, rate_limited: rateLimited, players_loaded: allPlayers?.length ?? 0,
    hl_ids_discovered: hlIdUpdates.length, hl_events_inserted: rows.length, hl_fixtures_synced: hlSyncedIds.length,
    espn_fixtures_checked: espnFixturesChecked, espn_events_inserted: espnRows.length, espn_fixtures_synced: espnSyncedIds.length,
    games_updated: gamesUpdated,
  }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
});
