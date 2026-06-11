import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hmasaapwbhxueuhxxqkd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYXNhYXB3Ymh4dWV1aHh4cWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI1OTgsImV4cCI6MjA5NjM4ODU5OH0.pAdFowezL_l7QLLA0Y4KgyGAcDbYtx0OppA_id1agdY';
const API_KEY = '1e60025d01a19a0d02428500673187e4';
const LEAGUE = 1;
const SEASON = 2026;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const FALLBACK_POTS = {
  1: ['Mexico','Canada','USA','Argentina','Brazil','France','England','Germany','Portugal','Netherlands','Spain','Belgium'],
  2: ['Croatia','Morocco','Colombia','Uruguay','Switzerland','Japan','Senegal','Iran','South Korea','Ecuador','Austria','Australia'],
  3: ['Norway','Panama','Egypt','Algeria','Scotland','Paraguay','Tunisia','Ivory Coast','Uzbekistan','Qatar','Saudi Arabia','South Africa'],
  4: ['Jordan','Cape Verde','Ghana','Curaçao','Haiti','New Zealand','Bosnia & Herzegovina','Sweden','Türkiye','Czechia','DR Congo','Iraq']
};

function getPot(teamName) {
  for (const [pot, teams] of Object.entries(FALLBACK_POTS)) {
    if (teams.some(t => t.toLowerCase() === teamName.toLowerCase())) return parseInt(pot);
  }
  return null;
}

function normalizePos(pos) {
  if (!pos) return 'MID';
  const p = pos.toUpperCase();
  if (p === 'GOALKEEPER') return 'GK';
  if (p === 'DEFENDER') return 'DEF';
  if (p === 'MIDFIELDER') return 'MID';
  if (p === 'ATTACKER' || p === 'FORWARD') return 'FWD';
  return 'MID';
}

async function apiFetch(endpoint) {
  const url = `https://v3.football.api-sports.io${endpoint}`;
  const res = await fetch(url, { headers: { 'x-apisports-key': API_KEY } });
  const json = await res.json();
  return json.response;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('Fetching teams...');
  const teamsData = await apiFetch(`/teams?league=${LEAGUE}&season=${SEASON}`);
  await sleep(1000);

  const teamRows = (teamsData || []).map(({ team }) => ({
    api_id: team.id,
    code: team.code || '',
    name: team.name,
    logo_url: team.logo,
    pot: getPot(team.name),
    eliminated: false
  }));

  if (teamRows.length > 0) {
    const { error } = await supabase.from('teams').upsert(teamRows, { onConflict: 'api_id' });
    if (error) console.error('Teams error:', error.message);
    else console.log(`Upserted ${teamRows.length} teams`);
  }

  console.log('Fetching fixtures...');
  const fixturesData = await apiFetch(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
  await sleep(1000);

  const fixtureRows = (fixturesData || []).map(({ fixture, teams: ft, goals, score }) => ({
    api_id: fixture.id,
    round: fixture.round,
    status_short: fixture.status.short,
    status_long: fixture.status.long,
    elapsed: fixture.status.elapsed,
    kickoff: fixture.date,
    home_team_api_id: ft.home.id,
    away_team_api_id: ft.away.id,
    home_goals: goals.home,
    away_goals: goals.away,
    winner_api_id: ft.home.winner ? ft.home.id : ft.away.winner ? ft.away.id : null,
    synced_final: fixture.status.short === 'FT',
    updated_at: new Date().toISOString()
  }));

  if (fixtureRows.length > 0) {
    for (let i = 0; i < fixtureRows.length; i += 50) {
      const chunk = fixtureRows.slice(i, i + 50);
      const { error } = await supabase.from('fixtures').upsert(chunk, { onConflict: 'api_id' });
      if (error) console.error('Fixtures error:', error.message);
    }
    console.log(`Upserted ${fixtureRows.length} fixtures`);
  }

  console.log('Fetching players (page 1)...');
  let page = 1;
  let hasMore = true;
  const allPlayerRows = [];

  while (hasMore) {
    const data = await apiFetch(`/players?league=${LEAGUE}&season=${SEASON}&page=${page}`);
    if (!data || data.length === 0) { hasMore = false; break; }
    data.forEach(({ player, statistics }) => {
      const stat = statistics?.[0];
      if (!stat) return;
      allPlayerRows.push({
        api_id: player.id,
        team_api_id: stat.team?.id,
        name: player.name,
        number: player.number,
        position: normalizePos(player.position),
        photo_url: player.photo
      });
    });
    console.log(`  Page ${page}: ${data.length} players`);
    page++;
    hasMore = data.length >= 20;
    await sleep(1100);
  }

  if (allPlayerRows.length > 0) {
    for (let i = 0; i < allPlayerRows.length; i += 50) {
      const chunk = allPlayerRows.slice(i, i + 50);
      const { error } = await supabase.from('players').upsert(chunk, { onConflict: 'api_id' });
      if (error) console.error('Players error:', error.message);
    }
    console.log(`Upserted ${allPlayerRows.length} players`);
  }

  console.log('Done!');
}

main().catch(console.error);
