import { createClient } from '@supabase/supabase-js';

const WC_SEASON = process.env.WC_SEASON || '2026';
const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY) { console.error('Missing API_FOOTBALL_KEY'); process.exit(1); }
if (!SUPABASE_URL) { console.error('Missing SUPABASE_URL'); process.exit(1); }
if (!SUPABASE_SERVICE_ROLE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FALLBACK_POTS = {
  1: ['Mexico','Canada','USA','Argentina','Brazil','France','England','Germany','Portugal','Netherlands','Spain','Belgium'],
  2: ['Croatia','Morocco','Colombia','Uruguay','Switzerland','Japan','Senegal','Iran','South Korea','Ecuador','Austria','Australia'],
  3: ['Norway','Panama','Egypt','Algeria','Scotland','Paraguay','Tunisia','Ivory Coast','Uzbekistan','Qatar','Saudi Arabia','South Africa'],
  4: ['Jordan','Cape Verde','Ghana','Curaçao','Haiti','New Zealand','Bosnia & Herzegovina','Sweden','Türkiye','Czechia','DR Congo','Iraq'],
};

function getPotForTeam(teamName) {
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    if (names.some(n => n.toLowerCase() === teamName.toLowerCase())) {
      return Number(pot);
    }
  }
  return null;
}

async function apiGet(path, params = {}) {
  const url = new URL(`https://v3.football.api-sports.io${path}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), {
    headers: {
      'x-apisports-key': API_KEY,
      'Origin': 'https://copa-fantasy-psi.vercel.app',
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log(`Starting backfill for season ${WC_SEASON}...`);

  // 1. Check API status
  try {
    const status = await apiGet('/status');
    console.log(`API requests remaining: ${status.response?.requests?.remaining ?? 'unknown'}`);
  } catch (err) {
    console.warn('Could not fetch API status:', err.message);
  }

  // 2. Fetch teams
  console.log('\nFetching teams...');
  let teamsData = [];
  try {
    const res = await apiGet('/teams', { league: 1, season: WC_SEASON });
    teamsData = res.response || [];
    console.log(`Found ${teamsData.length} teams`);
  } catch (err) {
    console.error('Failed to fetch teams:', err.message);
    process.exit(1);
  }

  for (const item of teamsData) {
    const team = item.team;
    if (!team) continue;
    const pot = getPotForTeam(team.name);
    const { error } = await supabase.from('teams').upsert({
      api_id: String(team.id),
      name: team.name,
      logo_url: team.logo || null,
      pot,
    }, { onConflict: 'api_id' });
    if (error) console.error(`  Error upserting team ${team.name}:`, error.message);
    else console.log(`  Upserted team: ${team.name} (pot ${pot})`);
  }

  // 3. Fetch squads for each team
  console.log('\nFetching squads...');
  for (const item of teamsData) {
    const team = item.team;
    if (!team) continue;
    console.log(`  Fetching squad for ${team.name}...`);
    try {
      const res = await apiGet('/players/squads', { team: team.id });
      const squadData = res.response?.[0]?.players || [];
      for (const player of squadData) {
        const { error } = await supabase.from('players').upsert({
          api_id: String(player.id),
          team_api_id: String(team.id),
          name: player.name,
          position: player.position,
          number: player.number || null,
          photo_url: player.photo || null,
        }, { onConflict: 'api_id' });
        if (error) console.error(`    Error upserting player ${player.name}:`, error.message);
      }
      console.log(`    Upserted ${squadData.length} players`);
    } catch (err) {
      console.error(`  Failed to fetch squad for ${team.name}:`, err.message);
    }
    await sleep(1100); // Throttle: 1 req/sec
  }

  // 4. Fetch fixtures
  console.log('\nFetching fixtures...');
  try {
    const res = await apiGet('/fixtures', { league: 1, season: WC_SEASON });
    const fixturesData = res.response || [];
    console.log(`Found ${fixturesData.length} fixtures`);

    for (const item of fixturesData) {
      const f = item.fixture;
      const teams = item.teams;
      const goals = item.goals;
      if (!f || !teams) continue;

      const { error } = await supabase.from('fixtures').upsert({
        api_id: String(f.id),
        home_team_api_id: String(teams.home.id),
        away_team_api_id: String(teams.away.id),
        home_score: goals?.home ?? null,
        away_score: goals?.away ?? null,
        status: f.status?.short || 'NS',
        kickoff_at: f.date || null,
      }, { onConflict: 'api_id' });
      if (error) console.error(`  Error upserting fixture ${f.id}:`, error.message);
    }
    console.log('Fixtures upserted');
  } catch (err) {
    console.error('Failed to fetch fixtures:', err.message);
  }

  console.log('\nBackfill complete!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
