import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hmasaapwbhxueuhxxqkd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYXNhYXB3Ymh4dWV1aHh4cWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI1OTgsImV4cCI6MjA5NjM4ODU5OH0.pAdFowezL_l7QLLA0Y4KgyGAcDbYtx0OppA_id1agdY';
const API_FOOTBALL_KEY = '1e60025d01a19a0d02428500673187e4';
const LEAGUE_ID = 1;
const SEASON = 2026;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  return null;
}

function normalizePosition(pos) {
  if (!pos) return 'FWD';
  const p = pos.toUpperCase();
  if (p === 'GOALKEEPER' || p === 'GK' || p === 'G') return 'GK';
  if (p === 'DEFENDER' || p === 'DEF' || p === 'D') return 'DEF';
  if (p === 'MIDFIELDER' || p === 'MID' || p === 'M') return 'MID';
  if (p === 'ATTACKER' || p === 'FORWARD' || p === 'FWD' || p === 'F' || p === 'ATT') return 'FWD';
  return 'FWD';
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchApi(path) {
  const url = `https://v3.football.api-sports.io${path}`;
  console.log(`GET ${url}`);
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_FOOTBALL_KEY,
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API errors: ${JSON.stringify(json.errors)}`);
  }
  return json.response || [];
}

async function backfillTeams() {
  console.log('\n=== Backfilling Teams ===');
  const data = await fetchApi(`/teams?league=${LEAGUE_ID}&season=${SEASON}`);
  await sleep(1000);

  let count = 0;
  for (const item of data) {
    const t = item.team;
    const pot = getPot(t.name);
    const { error } = await supabase.from('teams').upsert({
      api_id: t.id,
      name: t.name,
      code: t.code || t.name.substring(0, 3).toUpperCase(),
      logo_url: t.logo,
      pot,
      eliminated: false,
    }, { onConflict: 'api_id' });
    if (error) console.error(`Team upsert error for ${t.name}:`, error.message);
    else count++;
  }
  console.log(`Upserted ${count} teams`);
}

async function backfillPlayers() {
  console.log('\n=== Backfilling Players ===');
  let page = 1;
  let totalCount = 0;

  while (true) {
    const data = await fetchApi(`/players?league=${LEAGUE_ID}&season=${SEASON}&page=${page}`);
    await sleep(1000);
    if (!data || data.length === 0) break;

    for (const item of data) {
      const p = item.player;
      const stats = item.statistics?.[0] || {};
      const pos = normalizePosition(stats.games?.position || p.position);
      const { error } = await supabase.from('players').upsert({
        api_id: p.id,
        team_api_id: stats.team?.id || null,
        name: p.name,
        number: stats.games?.number || null,
        position: pos,
        photo_url: p.photo,
      }, { onConflict: 'api_id' });
      if (error) console.error(`Player upsert error for ${p.name}:`, error.message);
      else totalCount++;
    }

    console.log(`Page ${page}: processed ${data.length} players`);
    page++;

    // Most APIs have a paging limit; stop at 20 pages to be safe
    if (page > 20) break;
  }
  console.log(`Total players upserted: ${totalCount}`);
}

async function backfillFixtures() {
  console.log('\n=== Backfilling Fixtures ===');
  const data = await fetchApi(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
  await sleep(1000);

  let count = 0;
  for (const f of data) {
    const { error } = await supabase.from('fixtures').upsert({
      api_id: f.fixture.id,
      round: f.league.round,
      status_short: f.fixture.status.short,
      status_long: f.fixture.status.long,
      elapsed: f.fixture.status.elapsed,
      kickoff: f.fixture.date,
      home_team_api_id: f.teams.home.id,
      away_team_api_id: f.teams.away.id,
      home_goals: f.goals.home,
      away_goals: f.goals.away,
      winner_api_id: f.teams.home.winner ? f.teams.home.id : f.teams.away.winner ? f.teams.away.id : null,
      synced_final: ['FT', 'AET', 'PEN'].includes(f.fixture.status.short),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'api_id' });
    if (error) console.error(`Fixture upsert error:`, error.message);
    else count++;
  }
  console.log(`Upserted ${count} fixtures`);
}

async function main() {
  console.log(`Copa Fantasy 2026 Backfill Script`);
  console.log(`League: ${LEAGUE_ID}, Season: ${SEASON}`);

  try {
    await backfillTeams();
    await backfillPlayers();
    await backfillFixtures();
    console.log('\n✅ Backfill complete!');
  } catch (err) {
    console.error('\n❌ Backfill failed:', err.message);
    process.exit(1);
  }
}

main();
