import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WC_SEASON = process.env.WC_SEASON || '2026';
const LEAGUE_ID = 1; // FIFA World Cup

if (!API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FALLBACK_POTS = {
  1: ['Mexico', 'Canada', 'USA', 'Argentina', 'Brazil', 'France', 'England', 'Germany', 'Portugal', 'Netherlands', 'Spain', 'Belgium'],
  2: ['Croatia', 'Morocco', 'Colombia', 'Uruguay', 'Switzerland', 'Japan', 'Senegal', 'Iran', 'South Korea', 'Ecuador', 'Austria', 'Australia'],
  3: ['Norway', 'Panama', 'Egypt', 'Algeria', 'Scotland', 'Paraguay', 'Tunisia', 'Ivory Coast', 'Uzbekistan', 'Qatar', 'Saudi Arabia', 'South Africa'],
  4: ['Jordan', 'Cape Verde', 'Ghana', 'Curaçao', 'Haiti', 'New Zealand', 'Bosnia & Herzegovina', 'Sweden', 'Türkiye', 'Czechia', 'DR Congo', 'Iraq'],
};

function getPotForTeam(teamName) {
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    if (names.some((n) => teamName.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(teamName.toLowerCase()))) {
      return parseInt(pot);
    }
  }
  return null;
}

async function apiGet(path) {
  const url = `https://v3.football.api-sports.io${path}`;
  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API error ${res.status} for ${path}`);
  return res.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Copa Fantasy Backfill ===');
  console.log(`Season: ${WC_SEASON}, League: ${LEAGUE_ID}`);

  // 1. Check API status
  console.log('\n[1] Checking API status...');
  try {
    const statusData = await apiGet('/status');
    const remaining = statusData?.response?.requests?.limit_day - statusData?.response?.requests?.current;
    console.log(`  Remaining API calls today: ${remaining ?? 'unknown'}`);
    console.log(`  Account: ${statusData?.response?.account?.email ?? 'unknown'}`);
  } catch (err) {
    console.warn('  Could not fetch status:', err.message);
  }

  await sleep(1000);

  // 2. Fetch teams
  console.log('\n[2] Fetching teams...');
  let apiTeams = [];
  try {
    const teamsData = await apiGet(`/teams?league=${LEAGUE_ID}&season=${WC_SEASON}`);
    apiTeams = teamsData?.response || [];
    console.log(`  Found ${apiTeams.length} teams`);
  } catch (err) {
    console.error('  Failed to fetch teams:', err.message);
    process.exit(1);
  }

  // Upsert teams
  for (const entry of apiTeams) {
    const team = entry.team;
    const pot = getPotForTeam(team.name);
    const { error } = await supabase.from('teams').upsert(
      {
        api_id: team.id,
        name: team.name,
        logo_url: team.logo || null,
        pot,
      },
      { onConflict: 'api_id' }
    );
    if (error) console.warn(`  Upsert error for ${team.name}:`, error.message);
    else console.log(`  ✓ ${team.name} (Pot ${pot ?? '?'})`);
  }

  await sleep(1000);

  // 3. Fetch player squads for each team
  console.log('\n[3] Fetching player squads...');
  for (const entry of apiTeams) {
    const teamId = entry.team.id;
    const teamName = entry.team.name;
    console.log(`  Fetching squad for ${teamName} (${teamId})...`);

    try {
      const squadData = await apiGet(`/players/squads?team=${teamId}`);
      const players = squadData?.response?.[0]?.players || [];

      for (const player of players) {
        const { error } = await supabase.from('players').upsert(
          {
            api_id: player.id,
            team_api_id: teamId,
            name: player.name,
            position: player.position,
            number: player.number || null,
            photo_url: player.photo || null,
          },
          { onConflict: 'api_id' }
        );
        if (error) console.warn(`    Player upsert error ${player.name}:`, error.message);
      }
      console.log(`    ✓ ${players.length} players`);
    } catch (err) {
      console.warn(`    Failed for ${teamName}:`, err.message);
    }

    await sleep(1100); // ~1 req/sec to stay within rate limits
  }

  await sleep(1000);

  // 4. Fetch fixtures
  console.log('\n[4] Fetching fixtures...');
  try {
    const fixturesData = await apiGet(`/fixtures?league=${LEAGUE_ID}&season=${WC_SEASON}`);
    const fixtures = fixturesData?.response || [];
    console.log(`  Found ${fixtures.length} fixtures`);

    for (const entry of fixtures) {
      const fixture = entry.fixture;
      const teams = entry.teams;
      const goals = entry.goals;

      const { error } = await supabase.from('fixtures').upsert(
        {
          api_id: fixture.id,
          home_team_api_id: teams.home.id,
          away_team_api_id: teams.away.id,
          home_score: goals.home ?? null,
          away_score: goals.away ?? null,
          status: fixture.status.short || fixture.status.long,
          kickoff_at: fixture.date || null,
        },
        { onConflict: 'api_id' }
      );
      if (error) console.warn(`  Fixture upsert error ${fixture.id}:`, error.message);
    }
    console.log('  ✓ Fixtures upserted');
  } catch (err) {
    console.error('  Failed to fetch fixtures:', err.message);
  }

  console.log('\n=== Backfill complete ===');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
