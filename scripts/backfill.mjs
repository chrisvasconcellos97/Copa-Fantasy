// Usage: WC_SEASON=2026 node scripts/backfill.mjs
// Env: API_FOOTBALL_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEASON = process.env.WC_SEASON || '2026';
const LEAGUE = 1; // FIFA World Cup

if (!API_KEY) { console.error('Missing API_FOOTBALL_KEY'); process.exit(1); }
if (!SUPABASE_URL || !SERVICE_KEY) { console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

// Pot assignments (manual since API doesn't provide them)
const POT_MAP = {
  'Mexico': 1, 'Canada': 1, 'USA': 1, 'Argentina': 1, 'Brazil': 1,
  'France': 1, 'England': 1, 'Germany': 1, 'Portugal': 1, 'Netherlands': 1,
  'Spain': 1, 'Belgium': 1,
  'Croatia': 2, 'Morocco': 2, 'Colombia': 2, 'Uruguay': 2, 'Switzerland': 2,
  'Japan': 2, 'Senegal': 2, 'Iran': 2, 'South Korea': 2, 'Ecuador': 2,
  'Austria': 2, 'Australia': 2,
  'Norway': 3, 'Panama': 3, 'Egypt': 3, 'Algeria': 3, 'Scotland': 3,
  'Paraguay': 3, 'Tunisia': 3, 'Ivory Coast': 3, 'Uzbekistan': 3, 'Qatar': 3,
  'Saudi Arabia': 3, 'South Africa': 3,
  'Jordan': 4, 'Cape Verde': 4, 'Ghana': 4, 'Curacao': 4, 'Haiti': 4,
  'New Zealand': 4, 'Bosnia & Herzegovina': 4, 'Sweden': 4, 'Turkey': 4,
  'Czechia': 4, 'DR Congo': 4, 'Iraq': 4,
};

function getPot(name) {
  if (POT_MAP[name]) return POT_MAP[name];
  // Fuzzy match
  for (const [k, v] of Object.entries(POT_MAP)) {
    if (name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(name.toLowerCase())) return v;
  }
  return 4; // default
}

async function checkStatus() {
  console.log('\n=== Checking API Status ===');
  const data = await apiFetch('/status');
  const sub = data.response?.subscription;
  const reqs = data.response?.requests;
  console.log(`Plan: ${sub?.plan || 'unknown'}`);
  console.log(`Requests: ${reqs?.current}/${reqs?.limit_day} today`);
  return data.response;
}

async function backfillTeams() {
  console.log('\n=== Backfilling Teams ===');
  const data = await apiFetch(`/teams?league=${LEAGUE}&season=${SEASON}`);
  await sleep(1100);

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
      country: t.country || null,
    };
    const { error } = await supabase.from('teams').upsert(row, { onConflict: 'api_id' });
    if (error) console.error(`Team upsert error for ${t.name}:`, error.message);
    else console.log(`Upserted team: ${t.name} (Pot ${pot})`);
  }

  return teamsList;
}

async function backfillPlayers(teamsList) {
  console.log('\n=== Backfilling Players ===');
  for (const item of teamsList) {
    const t = item.team;
    console.log(`\nFetching squad for ${t.name} (id=${t.id})`);
    try {
      const data = await apiFetch(`/players/squads?team=${t.id}`);
      await sleep(1100);

      const squad = data.response?.[0]?.players || [];
      console.log(`  ${squad.length} players`);

      for (const p of squad) {
        const pos = normalizePosition(p.position);
        const row = {
          api_id: String(p.id),
          name: p.name,
          photo_url: p.photo || null,
          position: pos,
          number: p.number || null,
          team_api_id: String(t.id),
        };
        const { error } = await supabase.from('players').upsert(row, { onConflict: 'api_id' });
        if (error) console.error(`  Player upsert error for ${p.name}:`, error.message);
      }
    } catch (err) {
      console.error(`  Error fetching squad for ${t.name}:`, err.message);
      await sleep(2000);
    }
  }
}

async function backfillFixtures() {
  console.log('\n=== Backfilling Fixtures ===');
  const data = await apiFetch(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
  await sleep(1100);

  const fixtures = data.response || [];
  console.log(`Found ${fixtures.length} fixtures`);

  for (const f of fixtures) {
    const fix = f.fixture;
    const teams = f.teams;
    const goals = f.goals;
    const row = {
      api_id: String(fix.id),
      home_team: teams.home.name,
      away_team: teams.away.name,
      home_team_api_id: String(teams.home.id),
      away_team_api_id: String(teams.away.id),
      home_logo: teams.home.logo || null,
      away_logo: teams.away.logo || null,
      home_score: goals.home,
      away_score: goals.away,
      status: fix.status?.short || 'NS',
      match_date: fix.date || null,
      venue: fix.venue?.name || null,
      round: f.league?.round || null,
    };
    const { error } = await supabase.from('fixtures').upsert(row, { onConflict: 'api_id' });
    if (error) console.error(`Fixture upsert error for ${fix.id}:`, error.message);
  }

  console.log('Fixtures done.');
}

function normalizePosition(apiPos) {
  if (!apiPos) return 'MID';
  const p = apiPos.toString().toUpperCase().trim();
  if (p === 'G' || p === 'GK' || p === 'GOALKEEPER') return 'GK';
  if (p === 'D' || p === 'DEF' || p === 'DEFENDER') return 'DEF';
  if (p === 'M' || p === 'MID' || p === 'MIDFIELDER') return 'MID';
  if (p === 'F' || p === 'FWD' || p === 'FORWARD' || p === 'ATTACKER') return 'FWD';
  return 'MID';
}

async function main() {
  console.log(`Copa Fantasy 2026 Backfill — League ${LEAGUE}, Season ${SEASON}`);
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
