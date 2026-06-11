#!/usr/bin/env node
/**
 * Copa Fantasy 2026 - Backfill Script
 * Usage: WC_SEASON=2026 node scripts/backfill.mjs
 *
 * Required env vars:
 *   API_FOOTBALL_KEY         - API-Sports key
 *   SUPABASE_URL             - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEASON = process.env.WC_SEASON || '2026';
const LEAGUE_ID = 1; // FIFA World Cup

if (!API_KEY) { console.error('Missing API_FOOTBALL_KEY'); process.exit(1); }
if (!SUPABASE_URL) { console.error('Missing SUPABASE_URL'); process.exit(1); }
if (!SUPABASE_SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FALLBACK_POTS = {
  1: ['Mexico','Canada','USA','Argentina','Brazil','France','England','Germany','Portugal','Netherlands','Spain','Belgium'],
  2: ['Croatia','Morocco','Colombia','Uruguay','Switzerland','Japan','Senegal','Iran','South Korea','Ecuador','Austria','Australia'],
  3: ['Norway','Panama','Egypt','Algeria','Scotland','Paraguay','Tunisia','Ivory Coast','Uzbekistan','Qatar','Saudi Arabia','South Africa'],
  4: ['Jordan','Cape Verde','Ghana','Curaçao','Haiti','New Zealand','Bosnia & Herzegovina','Sweden','Türkiye','Czechia','DR Congo','Iraq'],
};

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function apiFetch(path) {
  const url = `https://v3.football.api-sports.io${path}`;
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status} for ${path}`);
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API errors: ${JSON.stringify(json.errors)}`);
  }
  return json;
}

function getPot(teamName) {
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    if (names.some((n) => n.toLowerCase() === teamName.toLowerCase())) {
      return parseInt(pot);
    }
  }
  return null;
}

async function main() {
  console.log('🚀 Copa Fantasy 2026 Backfill');
  console.log(`   Season: ${SEASON} | League: ${LEAGUE_ID}`);

  // 1. Check API status
  console.log('\n📡 Checking API status...');
  try {
    const statusData = await apiFetch('/status');
    const remaining = statusData?.response?.requests?.remaining ?? 'unknown';
    const limit = statusData?.response?.requests?.limit_day ?? 'unknown';
    console.log(`   Requests remaining: ${remaining}/${limit}`);
  } catch (err) {
    console.warn('   Could not fetch status:', err.message);
  }

  // 2. Fetch teams
  console.log('\n🌍 Fetching teams...');
  const teamsData = await apiFetch(`/teams?league=${LEAGUE_ID}&season=${SEASON}`);
  const apiTeams = teamsData?.response ?? [];
  console.log(`   Found ${apiTeams.length} teams`);

  const teamRows = apiTeams.map(({ team }) => ({
    api_id: team.id,
    name: team.name,
    logo_url: team.logo || null,
    pot: getPot(team.name),
  }));

  if (teamRows.length > 0) {
    const { error } = await supabase
      .from('teams')
      .upsert(teamRows, { onConflict: 'api_id' });
    if (error) console.error('   Teams upsert error:', error.message);
    else console.log(`   ✅ Upserted ${teamRows.length} teams`);
  }

  // 3. Fetch squads per team
  console.log('\n👥 Fetching player squads (throttled 1 req/sec)...');
  let totalPlayers = 0;
  for (const { team } of apiTeams) {
    try {
      await sleep(1000);
      const squadData = await apiFetch(`/players/squads?team=${team.id}`);
      const squads = squadData?.response ?? [];
      const playerRows = [];
      for (const { players } of squads) {
        for (const p of players) {
          playerRows.push({
            api_id: p.id,
            team_api_id: team.id,
            name: p.name,
            position: p.position || null,
            number: p.number || null,
            photo_url: p.photo || null,
          });
        }
      }
      if (playerRows.length > 0) {
        const { error } = await supabase
          .from('players')
          .upsert(playerRows, { onConflict: 'api_id' });
        if (error) console.error(`   Players error for ${team.name}:`, error.message);
        else {
          totalPlayers += playerRows.length;
          console.log(`   ✅ ${team.name}: ${playerRows.length} players`);
        }
      } else {
        console.log(`   ⚠️  ${team.name}: no players found`);
      }
    } catch (err) {
      console.error(`   ❌ Error for ${team.name}:`, err.message);
    }
  }
  console.log(`   Total players upserted: ${totalPlayers}`);

  // 4. Fetch fixtures
  console.log('\n📅 Fetching fixtures...');
  const fixturesData = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${SEASON}`);
  const apiFixtures = fixturesData?.response ?? [];
  console.log(`   Found ${apiFixtures.length} fixtures`);

  const fixtureRows = apiFixtures.map(({ fixture, teams, goals }) => ({
    api_id: fixture.id,
    home_team_api_id: teams.home.id,
    away_team_api_id: teams.away.id,
    home_score: goals.home,
    away_score: goals.away,
    status: fixture.status?.short || 'NS',
    kickoff_at: fixture.date || null,
  }));

  if (fixtureRows.length > 0) {
    const { error } = await supabase
      .from('fixtures')
      .upsert(fixtureRows, { onConflict: 'api_id' });
    if (error) console.error('   Fixtures upsert error:', error.message);
    else console.log(`   ✅ Upserted ${fixtureRows.length} fixtures`);
  }

  console.log('\n✅ Backfill complete!');
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
