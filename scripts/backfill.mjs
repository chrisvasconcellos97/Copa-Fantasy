import { createClient } from '@supabase/supabase-js';

const WC_SEASON = process.env.WC_SEASON || '2026';
const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing required env vars: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const FALLBACK_POTS = {
  1: ['Mexico', 'Canada', 'USA', 'Argentina', 'Brazil', 'France', 'England', 'Germany', 'Portugal', 'Netherlands', 'Spain', 'Belgium'],
  2: ['Croatia', 'Morocco', 'Colombia', 'Uruguay', 'Switzerland', 'Japan', 'Senegal', 'Iran', 'South Korea', 'Ecuador', 'Austria', 'Australia'],
  3: ['Norway', 'Panama', 'Egypt', 'Algeria', 'Scotland', 'Paraguay', 'Tunisia', 'Ivory Coast', 'Uzbekistan', 'Qatar', 'Saudi Arabia', 'South Africa'],
  4: ['Jordan', 'Cape Verde', 'Ghana', 'Curaçao', 'Haiti', 'New Zealand', 'Bosnia & Herzegovina', 'Sweden', 'Türkiye', 'Czechia', 'DR Congo', 'Iraq'],
};

function getPot(teamName) {
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    if (names.some((n) => n.toLowerCase() === teamName.toLowerCase())) {
      return parseInt(pot);
    }
  }
  return null;
}

async function apiFetch(path) {
  const url = `https://v3.football.api-sports.io${path}`;
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY,
    },
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status} for ${path}`);
  }
  return res.json();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`\n🌍 Copa Fantasy Backfill — Season ${WC_SEASON}\n`);

  // 1. Check API status / remaining calls
  try {
    const status = await apiFetch('/status');
    const remaining = status?.response?.requests?.current;
    const limit = status?.response?.requests?.limit_day;
    console.log(`📡 API Status: ${remaining}/${limit} requests used today`);
  } catch (err) {
    console.warn('Could not fetch API status:', err.message);
  }

  // 2. Fetch teams
  console.log('\n📋 Fetching teams...');
  let apiTeams = [];
  try {
    const teamsRes = await apiFetch(`/teams?league=1&season=${WC_SEASON}`);
    apiTeams = teamsRes?.response || [];
    console.log(`Found ${apiTeams.length} teams from API`);
  } catch (err) {
    console.warn('Failed to fetch teams from API:', err.message);
  }

  // If no teams from API, use FALLBACK_POTS
  if (apiTeams.length === 0) {
    console.log('Using FALLBACK_POTS to seed teams...');
    for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
      for (const name of names) {
        const apiId = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const { error } = await supabase.from('teams').upsert({
          api_id: apiId,
          name,
          logo_url: null,
          pot: parseInt(pot),
        }, { onConflict: 'api_id' });
        if (error) console.error(`Error upserting team ${name}:`, error.message);
      }
    }
    console.log('✅ Teams seeded from FALLBACK_POTS');
  } else {
    // Upsert teams from API
    for (const item of apiTeams) {
      const team = item.team;
      const pot = getPot(team.name);
      const { error } = await supabase.from('teams').upsert({
        api_id: String(team.id),
        name: team.name,
        logo_url: team.logo || null,
        pot,
      }, { onConflict: 'api_id' });
      if (error) console.error(`Error upserting team ${team.name}:`, error.message);
    }
    console.log(`✅ Upserted ${apiTeams.length} teams`);
  }

  // 3. Fetch player squads
  if (apiTeams.length > 0) {
    console.log('\n👤 Fetching player squads...');
    for (const item of apiTeams) {
      const team = item.team;
      try {
        const squadRes = await apiFetch(`/players/squads?team=${team.id}`);
        const squads = squadRes?.response || [];
        for (const squadItem of squads) {
          const players = squadItem.players || [];
          for (const player of players) {
            const { error } = await supabase.from('players').upsert({
              api_id: String(player.id),
              team_api_id: String(team.id),
              name: player.name,
              position: player.position || null,
              number: player.number || null,
              photo_url: player.photo || null,
            }, { onConflict: 'api_id' });
            if (error) console.error(`Error upserting player ${player.name}:`, error.message);
          }
        }
        console.log(`  ✓ ${team.name}: ${squads[0]?.players?.length || 0} players`);
      } catch (err) {
        console.warn(`  ✗ Failed squad for ${team.name}:`, err.message);
      }
      await sleep(1100); // throttle 1 req/sec
    }
    console.log('✅ Player squads loaded');
  }

  // 4. Fetch fixtures
  console.log('\n📅 Fetching fixtures...');
  try {
    const fixturesRes = await apiFetch(`/fixtures?league=1&season=${WC_SEASON}`);
    const fixtures = fixturesRes?.response || [];
    console.log(`Found ${fixtures.length} fixtures`);

    for (const item of fixtures) {
      const fixture = item.fixture;
      const teams = item.teams;
      const goals = item.goals;
      const { error } = await supabase.from('fixtures').upsert({
        api_id: String(fixture.id),
        home_team_api_id: String(teams.home.id),
        away_team_api_id: String(teams.away.id),
        home_score: goals.home ?? null,
        away_score: goals.away ?? null,
        status: fixture.status?.short || 'NS',
        kickoff_at: fixture.date || null,
      }, { onConflict: 'api_id' });
      if (error) console.error(`Error upserting fixture ${fixture.id}:`, error.message);
    }
    console.log(`✅ Upserted ${fixtures.length} fixtures`);
  } catch (err) {
    console.warn('Failed to fetch fixtures:', err.message);
  }

  console.log('\n🎉 Backfill complete!\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
