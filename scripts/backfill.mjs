#!/usr/bin/env node
/**
 * Copa Fantasy 2026 - Backfill Script
 * Usage: WC_SEASON=2026 node scripts/backfill.mjs
 *
 * Env vars required:
 *   API_FOOTBALL_KEY         - x-apisports-key
 *   SUPABASE_URL             - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
 */

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

const BASE_URL = 'https://v3.football.api-sports.io';
const HEADERS = {
  'x-apisports-key': API_KEY,
  'Content-Type': 'application/json',
};

async function apiFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`API error ${res.status} for ${path}`);
  }
  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    console.warn('API errors:', json.errors);
  }
  return json;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// FALLBACK_POTS for determining pot from team name
const FALLBACK_POTS = {
  1: ['Mexico', 'Canada', 'USA', 'Argentina', 'Brazil', 'France', 'England', 'Germany', 'Portugal', 'Netherlands', 'Spain', 'Belgium'],
  2: ['Croatia', 'Morocco', 'Colombia', 'Uruguay', 'Switzerland', 'Japan', 'Senegal', 'Iran', 'South Korea', 'Ecuador', 'Austria', 'Australia'],
  3: ['Norway', 'Panama', 'Egypt', 'Algeria', 'Scotland', 'Paraguay', 'Tunisia', 'Ivory Coast', 'Uzbekistan', 'Qatar', 'Saudi Arabia', 'South Africa'],
  4: ['Jordan', 'Cape Verde', 'Ghana', 'Curaçao', 'Haiti', 'New Zealand', 'Bosnia & Herzegovina', 'Sweden', 'Türkiye', 'Czechia', 'DR Congo', 'Iraq'],
};

function getPotForTeam(teamName) {
  for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
    const normalized = names.map((n) => n.toLowerCase());
    if (normalized.includes(teamName.toLowerCase())) {
      return Number(pot);
    }
  }
  return null;
}

function normalizePosition(pos) {
  if (!pos) return null;
  const p = pos.toUpperCase();
  if (p === 'G' || p === 'GOALKEEPER') return 'GK';
  if (p === 'D' || p === 'DEFENDER') return 'DEF';
  if (p === 'M' || p === 'MIDFIELDER') return 'MID';
  if (p === 'F' || p === 'ATTACKER' || p === 'FORWARD') return 'FWD';
  return pos;
}

async function main() {
  console.log(`\n🏆 Copa Fantasy 2026 Backfill — Season: ${WC_SEASON}`);
  console.log('='.repeat(50));

  // 1. Check API status
  console.log('\n1. Checking API status...');
  try {
    const status = await apiFetch('/status');
    const remaining = status.response?.requests?.remaining ?? 'unknown';
    const limit = status.response?.requests?.limit_day ?? 'unknown';
    console.log(`   ✓ API Requests remaining: ${remaining}/${limit}`);
  } catch (err) {
    console.warn('   ⚠ Could not fetch status:', err.message);
  }

  // 2. Fetch teams
  console.log(`\n2. Fetching teams for league ${LEAGUE_ID}, season ${WC_SEASON}...`);
  const teamsRes = await apiFetch(`/teams?league=${LEAGUE_ID}&season=${WC_SEASON}`);
  const teamsData = teamsRes.response || [];
  console.log(`   Found ${teamsData.length} teams`);

  const teamApiIds = [];

  for (const item of teamsData) {
    const team = item.team;
    const pot = getPotForTeam(team.name);
    const row = {
      api_id: team.id,
      name: team.name,
      logo_url: team.logo || null,
      pot,
    };

    const { error } = await supabase
      .from('teams')
      .upsert(row, { onConflict: 'api_id' });

    if (error) {
      console.error(`   ✗ Failed to upsert team ${team.name}:`, error.message);
    } else {
      console.log(`   ✓ ${team.name} (pot: ${pot ?? 'unknown'})`);
      teamApiIds.push(team.id);
    }
  }

  // 3. Fetch squads for each team
  console.log(`\n3. Fetching player squads (throttled at 1 req/sec)...`);
  for (const teamId of teamApiIds) {
    try {
      const squadRes = await apiFetch(`/players/squads?team=${teamId}`);
      const squadData = squadRes.response || [];
      const playerRows = [];

      for (const entry of squadData) {
        const players = entry.players || [];
        for (const p of players) {
          playerRows.push({
            api_id: p.id,
            team_api_id: teamId,
            name: p.name,
            position: normalizePosition(p.position),
            number: p.number || null,
            photo_url: p.photo || null,
          });
        }
      }

      if (playerRows.length > 0) {
        const { error } = await supabase
          .from('players')
          .upsert(playerRows, { onConflict: 'api_id' });
        if (error) {
          console.error(`   ✗ Failed to upsert players for team ${teamId}:`, error.message);
        } else {
          console.log(`   ✓ Team ${teamId}: ${playerRows.length} players`);
        }
      } else {
        console.log(`   - Team ${teamId}: no squad data`);
      }
    } catch (err) {
      console.error(`   ✗ Squad fetch failed for team ${teamId}:`, err.message);
    }

    await sleep(1000); // throttle: 1 req/sec
  }

  // 4. Fetch fixtures
  console.log(`\n4. Fetching fixtures...`);
  try {
    const fixturesRes = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${WC_SEASON}`);
    const fixturesData = fixturesRes.response || [];
    console.log(`   Found ${fixturesData.length} fixtures`);

    const fixtureRows = fixturesData.map((item) => ({
      api_id: item.fixture.id,
      home_team_api_id: item.teams.home.id,
      away_team_api_id: item.teams.away.id,
      home_score: item.goals?.home ?? null,
      away_score: item.goals?.away ?? null,
      status: item.fixture.status?.short || 'NS',
      kickoff_at: item.fixture.date || null,
    }));

    if (fixtureRows.length > 0) {
      // Upsert in batches of 50
      const batchSize = 50;
      for (let i = 0; i < fixtureRows.length; i += batchSize) {
        const batch = fixtureRows.slice(i, i + batchSize);
        const { error } = await supabase
          .from('fixtures')
          .upsert(batch, { onConflict: 'api_id' });
        if (error) {
          console.error(`   ✗ Fixture batch ${i}-${i + batchSize} error:`, error.message);
        }
      }
      console.log(`   ✓ Upserted ${fixtureRows.length} fixtures`);
    }
  } catch (err) {
    console.error('   ✗ Fixtures fetch failed:', err.message);
  }

  console.log('\n✅ Backfill complete!\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
