import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://hmasaapwbhxueuhxxqkd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WC_SEASON = process.env.WC_SEASON || '2026';
const LEAGUE_ID = 1; // FIFA World Cup

if (!API_KEY) {
  console.error('Missing env: API_FOOTBALL_KEY');
  process.exit(1);
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const FALLBACK_POTS = {
  1: ['Mexico', 'Canada', 'USA', 'Argentina', 'Brazil', 'France', 'England', 'Germany', 'Portugal', 'Netherlands', 'Spain', 'Belgium'],
  2: ['Croatia', 'Morocco', 'Colombia', 'Uruguay', 'Switzerland', 'Japan', 'Senegal', 'Iran', 'South Korea', 'Ecuador', 'Austria', 'Australia'],
  3: ['Norway', 'Panama', 'Egypt', 'Algeria', 'Scotland', 'Paraguay', 'Tunisia', 'Ivory Coast', 'Uzbekistan', 'Qatar', 'Saudi Arabia', 'South Africa'],
  4: ['Jordan', 'Cape Verde', 'Ghana', 'Curaçao', 'Haiti', 'New Zealand', 'Bosnia & Herzegovina', 'Sweden', 'Türkiye', 'Czechia', 'DR Congo', 'Iraq'],
};

function getPotForTeam(teamName) {
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    if (names.some((n) => teamName.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(teamName.toLowerCase()))) {
      return Number(pot);
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
  console.log(`\n🌍 Copa Fantasy Backfill — Season ${WC_SEASON}\n`);

  // 1. Check API status
  try {
    const statusData = await apiGet('/status');
    const limits = statusData?.response?.requests;
    if (limits) {
      console.log(`API calls remaining: ${limits.limit - limits.current} / ${limits.limit}`);
    }
  } catch (err) {
    console.warn('Could not fetch API status:', err.message);
  }

  // 2. Fetch teams
  console.log('\n📋 Fetching teams...');
  let teamsData;
  try {
    teamsData = await apiGet(`/teams?league=${LEAGUE_ID}&season=${WC_SEASON}`);
  } catch (err) {
    console.error('Failed to fetch teams:', err.message);
    process.exit(1);
  }

  const apiTeams = teamsData?.response || [];
  console.log(`Found ${apiTeams.length} teams`);

  const teamRows = apiTeams.map(({ team }) => ({
    api_id: String(team.id),
    name: team.name,
    logo_url: team.logo || null,
    pot: getPotForTeam(team.name),
  }));

  if (teamRows.length > 0) {
    const { error } = await supabase
      .from('teams')
      .upsert(teamRows, { onConflict: 'api_id' });
    if (error) console.error('Team upsert error:', error.message);
    else console.log(`✅ Upserted ${teamRows.length} teams`);
  }

  // 3. Fetch player squads per team
  console.log('\n👤 Fetching player squads...');
  for (const { team } of apiTeams) {
    try {
      await sleep(1100); // Throttle: 1 req/sec
      const squadData = await apiGet(`/players/squads?team=${team.id}`);
      const players = squadData?.response?.[0]?.players || [];

      if (players.length === 0) {
        console.log(`  ${team.name}: no players`);
        continue;
      }

      const playerRows = players.map((p) => ({
        api_id: String(p.id),
        team_api_id: String(team.id),
        name: p.name,
        position: p.position || null,
        number: p.number || null,
        photo_url: p.photo || null,
      }));

      const { error } = await supabase
        .from('players')
        .upsert(playerRows, { onConflict: 'api_id' });

      if (error) {
        console.error(`  ${team.name}: upsert error:`, error.message);
      } else {
        console.log(`  ✅ ${team.name}: ${playerRows.length} players`);
      }
    } catch (err) {
      console.error(`  ${team.name}: ${err.message}`);
    }
  }

  // 4. Fetch fixtures
  console.log('\n📅 Fetching fixtures...');
  await sleep(1100);
  let fixtureData;
  try {
    fixtureData = await apiGet(`/fixtures?league=${LEAGUE_ID}&season=${WC_SEASON}`);
  } catch (err) {
    console.error('Failed to fetch fixtures:', err.message);
    process.exit(1);
  }

  const apiFixtures = fixtureData?.response || [];
  console.log(`Found ${apiFixtures.length} fixtures`);

  const fixtureRows = apiFixtures.map(({ fixture, teams: fixtureTeams, goals }) => ({
    api_id: String(fixture.id),
    home_team_api_id: String(fixtureTeams.home.id),
    away_team_api_id: String(fixtureTeams.away.id),
    home_score: goals?.home ?? null,
    away_score: goals?.away ?? null,
    status: fixture.status?.short || 'NS',
    kickoff_at: fixture.date || null,
  }));

  if (fixtureRows.length > 0) {
    // Upsert in batches of 50
    for (let i = 0; i < fixtureRows.length; i += 50) {
      const batch = fixtureRows.slice(i, i + 50);
      const { error } = await supabase
        .from('fixtures')
        .upsert(batch, { onConflict: 'api_id' });
      if (error) console.error(`Fixture batch ${i}-${i + 50} error:`, error.message);
    }
    console.log(`✅ Upserted ${fixtureRows.length} fixtures`);
  }

  console.log('\n✅ Backfill complete!\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
