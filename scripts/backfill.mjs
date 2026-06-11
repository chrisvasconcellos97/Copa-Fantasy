import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hmasaapwbhxueuhxxqkd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY) { console.error('Missing API_FOOTBALL_KEY'); process.exit(1); }
if (!SUPABASE_SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BASE = 'https://v3.football.api-sports.io';
const LEAGUE = 1;    // World Cup
const SEASON = 2026;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'x-apisports-key': API_KEY,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status} for ${path}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API errors: ${JSON.stringify(json.errors)}`);
  }
  return json.response;
}

function normalizePosition(pos) {
  if (!pos) return 'MID';
  const p = pos.toUpperCase();
  if (p.includes('ATTACKER') || p.includes('FORWARD')) return 'FWD';
  if (p.includes('MIDFIELDER') || p.includes('MIDFIELD')) return 'MID';
  if (p.includes('DEFENDER') || p.includes('DEFENCE') || p.includes('DEFENSE')) return 'DEF';
  if (p.includes('GOALKEEPER') || p.includes('KEEPER')) return 'GK';
  return 'MID';
}

const FALLBACK_POTS = {
  'Mexico': 1, 'Canada': 1, 'United States': 1, 'Argentina': 1, 'Brazil': 1,
  'France': 1, 'England': 1, 'Germany': 1, 'Portugal': 1, 'Netherlands': 1,
  'Spain': 1, 'Belgium': 1,
  'Croatia': 2, 'Morocco': 2, 'Colombia': 2, 'Uruguay': 2, 'Switzerland': 2,
  'Japan': 2, 'Senegal': 2, 'Iran': 2, 'South Korea': 2, 'Ecuador': 2,
  'Austria': 2, 'Australia': 2,
  'Norway': 3, 'Panama': 3, 'Egypt': 3, 'Algeria': 3, 'Scotland': 3,
  'Paraguay': 3, 'Tunisia': 3, 'Ivory Coast': 3, "Côte d'Ivoire": 3,
  'Uzbekistan': 3, 'Qatar': 3, 'Saudi Arabia': 3, 'South Africa': 3,
  'Jordan': 4, 'Cape Verde': 4, 'Ghana': 4, 'Curaçao': 4, 'Haiti': 4,
  'New Zealand': 4, 'Bosnia & Herzegovina': 4, 'Sweden': 4,
  'Türkiye': 4, 'Czechia': 4, 'DR Congo': 4, 'Iraq': 4,
};

async function run() {
  console.log('🏆 Copa Fantasy 2026 Backfill Script');
  console.log('====================================');

  // 1. Fetch teams
  console.log('\n📦 Fetching WC 2026 teams...');
  const teamsData = await apiFetch(`/teams?league=${LEAGUE}&season=${SEASON}`);
  await sleep(1100);

  const teamsToUpsert = teamsData.map(({ team, venue }) => ({
    api_id: team.id,
    name: team.name,
    flag_url: team.logo || team.flag || null,
    pot: FALLBACK_POTS[team.name] || 4,
    group_letter: null,
  }));

  console.log(`  Found ${teamsToUpsert.length} teams`);
  const { error: teamsErr } = await supabase.from('teams').upsert(teamsToUpsert, { onConflict: 'api_id' });
  if (teamsErr) console.error('  Teams upsert error:', teamsErr.message);
  else console.log('  ✓ Teams upserted');

  // 2. Fetch players per team
  console.log('\n👤 Fetching players...');
  let totalPlayers = 0;
  for (const { team } of teamsData) {
    console.log(`  → ${team.name}...`);
    try {
      const squadsData = await apiFetch(`/players/squads?team=${team.id}`);
      await sleep(1100);

      if (!squadsData || !squadsData.length) continue;
      const squad = squadsData[0]?.players || [];

      const playersToUpsert = squad.map(p => ({
        api_id: p.id,
        team_api_id: team.id,
        name: p.name,
        position: normalizePosition(p.position),
        photo_url: p.photo || null,
        shirt_number: p.number || null,
      }));

      if (playersToUpsert.length) {
        const { error: pErr } = await supabase.from('players').upsert(playersToUpsert, { onConflict: 'api_id' });
        if (pErr) console.error(`    Error upserting players for ${team.name}:`, pErr.message);
        else { totalPlayers += playersToUpsert.length; console.log(`    ✓ ${playersToUpsert.length} players`); }
      }
    } catch (e) {
      console.error(`  Error fetching squad for ${team.name}:`, e.message);
      await sleep(1100);
    }
  }
  console.log(`  Total players upserted: ${totalPlayers}`);

  // 3. Fetch fixtures
  console.log('\n📅 Fetching fixtures...');
  const fixturesData = await apiFetch(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
  await sleep(1100);

  const fixturesToUpsert = fixturesData.map(({ fixture, teams: ft, goals, league: lg, score }) => ({
    api_id: fixture.id,
    home_team_api_id: ft.home.id,
    away_team_api_id: ft.away.id,
    home_team: ft.home.name,
    away_team: ft.away.name,
    match_date: fixture.date,
    status: fixture.status?.short || 'NS',
    home_score: goals?.home,
    away_score: goals?.away,
    group_letter: lg?.round?.includes('Group') ? lg.round.replace('Group Stage - ', '').replace('Group ', '') : null,
    round: lg?.round || null,
  }));

  console.log(`  Found ${fixturesToUpsert.length} fixtures`);
  const { error: fixErr } = await supabase.from('fixtures').upsert(fixturesToUpsert, { onConflict: 'api_id' });
  if (fixErr) console.error('  Fixtures upsert error:', fixErr.message);
  else console.log('  ✓ Fixtures upserted');

  console.log('\n✅ Backfill complete!');
}

run().catch(e => { console.error('Fatal error:', e); process.exit(1); });
