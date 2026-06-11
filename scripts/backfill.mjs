import { createClient } from '@supabase/supabase-js';

const WC_SEASON = process.env.WC_SEASON || '2026';
const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hmasaapwbhxueuhxxqkd.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY) {
  console.error('ERROR: API_FOOTBALL_KEY env var is required');
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY env var is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const API_BASE = 'https://v3.football.api-sports.io';
const LEAGUE_ID = 1; // World Cup

const FALLBACK_POTS = {
  1: ['Mexico', 'Canada', 'USA', 'Argentina', 'Brazil', 'France', 'England', 'Germany', 'Portugal', 'Netherlands', 'Spain', 'Belgium'],
  2: ['Croatia', 'Morocco', 'Colombia', 'Uruguay', 'Switzerland', 'Japan', 'Senegal', 'Iran', 'South Korea', 'Ecuador', 'Austria', 'Australia'],
  3: ['Norway', 'Panama', 'Egypt', 'Algeria', 'Scotland', 'Paraguay', 'Tunisia', 'Ivory Coast', 'Uzbekistan', 'Qatar', 'Saudi Arabia', 'South Africa'],
  4: ['Jordan', 'Cape Verde', 'Ghana', 'Curaçao', 'Haiti', 'New Zealand', 'Bosnia & Herzegovina', 'Sweden', 'Türkiye', 'Czechia', 'DR Congo', 'Iraq'],
};

function getPotForTeam(name) {
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    const norm = n => n.toLowerCase().replace(/[^a-z]/g, '');
    if (names.some(n => norm(n) === norm(name))) return parseInt(pot);
  }
  return null;
}

async function apiFetch(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API error ${res.status} for ${path}`);
  return res.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('--- Copa Fantasy Backfill Script ---');
  console.log(`Season: ${WC_SEASON}`);

  // 1. Check API status
  console.log('\n[1] Checking API status...');
  try {
    const status = await apiFetch('/status');
    const remaining = status?.response?.requests?.remaining;
    const limit = status?.response?.requests?.limit_day;
    console.log(`    Remaining API calls: ${remaining} / ${limit}`);
  } catch (err) {
    console.warn('    Could not fetch API status:', err.message);
  }

  // 2. Fetch teams
  console.log('\n[2] Fetching teams...');
  const teamsData = await apiFetch(`/teams?league=${LEAGUE_ID}&season=${WC_SEASON}`);
  const apiTeams = teamsData?.response || [];
  console.log(`    Found ${apiTeams.length} teams`);

  for (const entry of apiTeams) {
    const team = entry.team;
    const pot = getPotForTeam(team.name);
    const row = {
      api_id: String(team.id),
      name: team.name,
      logo_url: team.logo || null,
      pot,
    };
    const { error } = await supabase
      .from('teams')
      .upsert(row, { onConflict: 'api_id' });
    if (error) console.warn(`    Error upserting team ${team.name}:`, error.message);
    else console.log(`    ✓ ${team.name} (pot ${pot})`);
  }

  // 3. Fetch player squads
  console.log('\n[3] Fetching player squads...');
  for (const entry of apiTeams) {
    const team = entry.team;
    console.log(`    Fetching squad for ${team.name} (id: ${team.id})...`);
    try {
      const squadData = await apiFetch(`/players/squads?team=${team.id}`);
      const players = squadData?.response?.[0]?.players || [];
      for (const player of players) {
        const row = {
          api_id: String(player.id),
          team_api_id: String(team.id),
          name: player.name,
          position: player.position,
          number: player.number || null,
          photo_url: player.photo || null,
        };
        const { error } = await supabase
          .from('players')
          .upsert(row, { onConflict: 'api_id' });
        if (error) console.warn(`      Error upserting player ${player.name}:`, error.message);
      }
      console.log(`      ✓ ${players.length} players`);
    } catch (err) {
      console.warn(`      Error fetching squad for ${team.name}:`, err.message);
    }
    await sleep(1100); // throttle: 1 req/sec
  }

  // 4. Fetch fixtures
  console.log('\n[4] Fetching fixtures...');
  const fixturesData = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${WC_SEASON}`);
  const apiFixtures = fixturesData?.response || [];
  console.log(`    Found ${apiFixtures.length} fixtures`);

  for (const entry of apiFixtures) {
    const f = entry.fixture;
    const teams = entry.teams;
    const goals = entry.goals;
    const row = {
      api_id: String(f.id),
      home_team_api_id: String(teams.home.id),
      away_team_api_id: String(teams.away.id),
      home_score: goals.home,
      away_score: goals.away,
      status: f.status.short,
      kickoff_at: f.date || null,
    };
    const { error } = await supabase
      .from('fixtures')
      .upsert(row, { onConflict: 'api_id' });
    if (error) console.warn(`    Error upserting fixture ${f.id}:`, error.message);
  }
  console.log(`    ✓ ${apiFixtures.length} fixtures upserted`);

  console.log('\n--- Backfill complete! ---');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
