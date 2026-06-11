import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WC_SEASON = process.env.WC_SEASON || '2026';
const LEAGUE_ID = 1; // FIFA World Cup

if (!API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const FALLBACK_POTS = {
  1: ['Mexico','Canada','USA','Argentina','Brazil','France','England','Germany','Portugal','Netherlands','Spain','Belgium'],
  2: ['Croatia','Morocco','Colombia','Uruguay','Switzerland','Japan','Senegal','Iran','South Korea','Ecuador','Austria','Australia'],
  3: ['Norway','Panama','Egypt','Algeria','Scotland','Paraguay','Tunisia','Ivory Coast','Uzbekistan','Qatar','Saudi Arabia','South Africa'],
  4: ['Jordan','Cape Verde','Ghana','Curaçao','Haiti','New Zealand','Bosnia & Herzegovina','Sweden','Türkiye','Czechia','DR Congo','Iraq'],
};

function getPotForTeam(teamName) {
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    const match = names.find(
      (n) => n.toLowerCase() === teamName.toLowerCase() ||
             teamName.toLowerCase().includes(n.toLowerCase()) ||
             n.toLowerCase().includes(teamName.toLowerCase())
    );
    if (match) return Number(pot);
  }
  return null;
}

async function apiGet(path) {
  const url = `https://v3.football.api-sports.io${path}`;
  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status} for ${path}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('=== Copa Fantasy Backfill ===');
  console.log(`Season: ${WC_SEASON}, League: ${LEAGUE_ID}`);

  // 1. Check API status
  console.log('\n[1/4] Checking API status...');
  try {
    const status = await apiGet('/status');
    const remaining = status?.response?.requests?.remaining ?? 'unknown';
    const limit = status?.response?.requests?.limit_day ?? 'unknown';
    console.log(`API calls remaining today: ${remaining} / ${limit}`);
  } catch (err) {
    console.warn('Could not fetch status:', err.message);
  }

  // 2. Fetch teams
  console.log('\n[2/4] Fetching teams...');
  let teamRows = [];
  try {
    const teamsData = await apiGet(`/teams?league=${LEAGUE_ID}&season=${WC_SEASON}`);
    const teams = teamsData?.response || [];
    console.log(`Found ${teams.length} teams`);

    for (const item of teams) {
      const t = item.team;
      const pot = getPotForTeam(t.name);
      teamRows.push({
        api_id: t.id,
        name: t.name,
        logo_url: t.logo || null,
        pot,
      });
    }

    if (teamRows.length > 0) {
      const { error } = await supabase
        .from('teams')
        .upsert(teamRows, { onConflict: 'api_id' });
      if (error) console.error('Teams upsert error:', error.message);
      else console.log(`Upserted ${teamRows.length} teams`);
    }
  } catch (err) {
    console.error('Error fetching teams:', err.message);
  }

  // 3. Fetch players for each team
  console.log('\n[3/4] Fetching player squads (1 req/sec)...');
  const teamsToProcess = teamRows.length > 0 ? teamRows : [];

  for (const team of teamsToProcess) {
    try {
      await sleep(1000);
      const data = await apiGet(`/players/squads?team=${team.api_id}`);
      const players = data?.response?.[0]?.players || [];

      if (players.length === 0) {
        console.log(`  ${team.name}: no players found`);
        continue;
      }

      const playerRows = players.map((p) => ({
        api_id: p.id,
        team_api_id: team.api_id,
        name: p.name,
        position: p.position || null,
        number: p.number || null,
        photo_url: p.photo || null,
      }));

      const { error } = await supabase
        .from('players')
        .upsert(playerRows, { onConflict: 'api_id' });

      if (error) console.error(`  ${team.name} players error:`, error.message);
      else console.log(`  ${team.name}: upserted ${playerRows.length} players`);
    } catch (err) {
      console.error(`  Error for team ${team.name}:`, err.message);
    }
  }

  // 4. Fetch fixtures
  console.log('\n[4/4] Fetching fixtures...');
  try {
    const fixturesData = await apiGet(`/fixtures?league=${LEAGUE_ID}&season=${WC_SEASON}`);
    const fixtures = fixturesData?.response || [];
    console.log(`Found ${fixtures.length} fixtures`);

    const fixtureRows = fixtures.map((f) => ({
      api_id: f.fixture.id,
      home_team_api_id: f.teams.home.id,
      away_team_api_id: f.teams.away.id,
      home_score: f.goals.home,
      away_score: f.goals.away,
      status: f.fixture.status.short,
      kickoff_at: f.fixture.date || null,
    }));

    if (fixtureRows.length > 0) {
      const { error } = await supabase
        .from('fixtures')
        .upsert(fixtureRows, { onConflict: 'api_id' });
      if (error) console.error('Fixtures upsert error:', error.message);
      else console.log(`Upserted ${fixtureRows.length} fixtures`);
    }
  } catch (err) {
    console.error('Error fetching fixtures:', err.message);
  }

  console.log('\n✓ Backfill complete!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
