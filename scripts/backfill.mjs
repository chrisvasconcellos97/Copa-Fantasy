// Usage: WC_SEASON=2026 node scripts/backfill.mjs
// Env: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WC_SEASON = process.env.WC_SEASON || '2026';
const LEAGUE = 1; // FIFA World Cup

if (!API_KEY) { console.error('Missing API_FOOTBALL_KEY'); process.exit(1); }
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const FALLBACK_POTS = {
  1: ['Mexico', 'Canada', 'USA', 'Argentina', 'Brazil', 'France', 'England', 'Germany', 'Portugal', 'Netherlands', 'Spain', 'Belgium'],
  2: ['Croatia', 'Morocco', 'Colombia', 'Uruguay', 'Switzerland', 'Japan', 'Senegal', 'Iran', 'South Korea', 'Ecuador', 'Austria', 'Australia'],
  3: ['Norway', 'Panama', 'Egypt', 'Algeria', 'Scotland', 'Paraguay', 'Tunisia', 'Ivory Coast', 'Uzbekistan', 'Qatar', 'Saudi Arabia', 'South Africa'],
  4: ['Jordan', 'Cape Verde', 'Ghana', 'Curaçao', 'Haiti', 'New Zealand', 'Bosnia & Herzegovina', 'Sweden', 'Türkiye', 'Czechia', 'DR Congo', 'Iraq'],
};

function getPot(teamName) {
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    if (names.some((n) => n.toLowerCase() === teamName.toLowerCase())) {
      return Number(pot);
    }
  }
  // fuzzy match
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    if (names.some((n) =>
      teamName.toLowerCase().includes(n.toLowerCase()) ||
      n.toLowerCase().includes(teamName.toLowerCase())
    )) {
      return Number(pot);
    }
  }
  return 4;
}

function normalizePosition(pos) {
  if (!pos) return 'MID';
  const p = pos.toUpperCase().trim();
  if (p === 'G' || p === 'GK' || p === 'GOALKEEPER') return 'GK';
  if (p === 'D' || p === 'DEF' || p === 'DEFENDER') return 'DEF';
  if (p === 'M' || p === 'MID' || p === 'MIDFIELDER') return 'MID';
  if (p === 'F' || p === 'FWD' || p === 'FORWARD' || p === 'ATTACKER' || p === 'ATT') return 'FWD';
  return 'MID';
}

async function apiFetch(path) {
  const url = `https://v3.football.api-sports.io${path}`;
  console.log('GET', url);
  const res = await fetch(url, {
    headers: { 'x-apisports-key': API_KEY },
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error('API errors: ' + JSON.stringify(json.errors));
  }
  return json;
}

async function checkStatus() {
  console.log('\n=== API Status ===');
  const data = await apiFetch('/status');
  const reqs = data.response?.requests;
  console.log(`Requests today: ${reqs?.current}/${reqs?.limit_day}`);
  console.log(`Remaining: ${reqs?.limit_day - reqs?.current}`);
  return data.response;
}

async function backfillTeams() {
  console.log('\n=== Backfilling Teams ===');
  const data = await apiFetch(`/teams?league=${LEAGUE}&season=${WC_SEASON}`);
  await sleep(1000);

  const teamsList = data.response || [];
  console.log(`Found ${teamsList.length} teams`);

  for (const item of teamsList) {
    const t = item.team;
    const pot = getPot(t.name);
    const row = {
      api_id: String(t.id),
      name: t.name,
      logo_url: t.logo || null,
      pot,
    };
    const { error } = await supabase.from('teams').upsert(row, { onConflict: 'api_id' });
    if (error) console.error(`  Team upsert error for ${t.name}:`, error.message);
    else console.log(`  Upserted: ${t.name} (Pot ${pot})`);
  }

  return teamsList;
}

async function backfillPlayers(teamsList) {
  console.log('\n=== Backfilling Players (squads) ===');
  for (const item of teamsList) {
    const t = item.team;
    console.log(`\nFetching squad for ${t.name} (id=${t.id})`);
    try {
      const data = await apiFetch(`/players/squads?team=${t.id}`);
      await sleep(1000);

      const squad = data.response?.[0]?.players || [];
      console.log(`  ${squad.length} players`);

      for (const p of squad) {
        const row = {
          api_id: String(p.id),
          name: p.name,
          photo_url: p.photo || null,
          position: normalizePosition(p.position),
          number: p.number || null,
          team_api_id: String(t.id),
        };
        const { error } = await supabase.from('players').upsert(row, { onConflict: 'api_id' });
        if (error) console.error(`  Player upsert error ${p.name}:`, error.message);
      }
    } catch (err) {
      console.error(`  Error fetching squad for ${t.name}:`, err.message);
      await sleep(2000);
    }
  }
}

async function backfillFixtures() {
  console.log('\n=== Backfilling Fixtures ===');
  const data = await apiFetch(`/fixtures?league=${LEAGUE}&season=${WC_SEASON}`);
  await sleep(1000);

  const fixtures = data.response || [];
  console.log(`Found ${fixtures.length} fixtures`);

  for (const f of fixtures) {
    const fix = f.fixture;
    const teams = f.teams;
    const goals = f.goals;
    const row = {
      api_id: String(fix.id),
      home_team_api_id: String(teams.home.id),
      away_team_api_id: String(teams.away.id),
      home_score: goals.home,
      away_score: goals.away,
      status: fix.status?.short || 'NS',
      kickoff_at: fix.date || null,
    };
    const { error } = await supabase.from('fixtures').upsert(row, { onConflict: 'api_id' });
    if (error) console.error(`  Fixture upsert error ${fix.id}:`, error.message);
  }

  console.log('Fixtures done.');
}

async function main() {
  console.log(`Copa Fantasy Backfill — League ${LEAGUE}, Season ${WC_SEASON}`);
  try {
    await checkStatus();
    const teamsList = await backfillTeams();
    if (teamsList.length > 0) {
      await backfillPlayers(teamsList);
    }
    await backfillFixtures();
    console.log('\n✅ Backfill complete!');
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    process.exit(1);
  }
}

main();
