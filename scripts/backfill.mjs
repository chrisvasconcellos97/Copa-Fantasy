/**
 * Copa Fantasy 2026 – Backfill Script
 *
 * Usage:
 *   WC_SEASON=2026 node scripts/backfill.mjs
 *
 * Required env vars:
 *   API_FOOTBALL_KEY          – API-Sports key
 *   SUPABASE_URL              – Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY – Supabase service role key (bypasses RLS)
 */

import { createClient } from '@supabase/supabase-js';

const API_KEY = process.env.API_FOOTBALL_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WC_SEASON = process.env.WC_SEASON || '2026';
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

// Build a name → pot lookup
const nameToPot = {};
for (const [pot, names] of Object.entries(FALLBACK_POTS)) {
  for (const name of names) nameToPot[name.toLowerCase()] = Number(pot);
}

function potForTeam(name) {
  const lower = (name || '').toLowerCase();
  return nameToPot[lower] || 4;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function apiFetch(path) {
  const url = `https://v3.football.api-sports.io${path}`;
  const res = await fetch(url, {
    headers: {
      'x-apisports-key': API_KEY,
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status} on ${path}`);
  return res.json();
}

async function main() {
  console.log(`\n🚀 Copa Fantasy Backfill — Season ${WC_SEASON}, League ${LEAGUE_ID}\n`);

  // ── 1. Check API status ──────────────────────────────────────────────────
  console.log('📡 Checking API status…');
  try {
    const statusData = await apiFetch('/status');
    const sub = statusData.response?.subscription;
    const requests = statusData.response?.requests;
    if (sub) {
      console.log(`  Plan: ${sub.plan}`);
      console.log(`  Remaining calls today: ${requests?.current ?? '?'} / ${requests?.limit_day ?? '?'}`);
    }
  } catch (e) {
    console.warn(`  Could not fetch status: ${e.message}`);
  }

  // ── 2. Fetch & upsert teams ──────────────────────────────────────────────
  console.log('\n🏴 Fetching teams…');
  const teamsData = await apiFetch(`/teams?league=${LEAGUE_ID}&season=${WC_SEASON}`);
  const apiTeams = teamsData.response || [];
  console.log(`  Found ${apiTeams.length} teams from API.`);

  const teamRows = apiTeams.map((entry) => ({
    api_id: String(entry.team.id),
    name: entry.team.name,
    logo_url: entry.team.logo || null,
    pot: potForTeam(entry.team.name),
  }));

  if (teamRows.length > 0) {
    const { error } = await supabase
      .from('teams')
      .upsert(teamRows, { onConflict: 'api_id' });
    if (error) console.error('  Teams upsert error:', error.message);
    else console.log(`  ✓ Upserted ${teamRows.length} teams.`);
  } else {
    // Fallback: insert teams from FALLBACK_POTS
    console.log('  No teams from API. Inserting from FALLBACK_POTS…');
    const fallbackRows = Object.entries(FALLBACK_POTS).flatMap(([pot, names]) =>
      names.map((name) => ({
        api_id: name.toLowerCase().replace(/[\s&]/g, '_'),
        name,
        logo_url: null,
        pot: Number(pot),
      }))
    );
    const { error } = await supabase.from('teams').upsert(fallbackRows, { onConflict: 'api_id' });
    if (error) console.error('  Fallback teams upsert error:', error.message);
    else console.log(`  ✓ Inserted ${fallbackRows.length} fallback teams.`);
  }

  // ── 3. Fetch squad players per team ─────────────────────────────────────
  if (apiTeams.length > 0) {
    console.log('\n👕 Fetching squads (1 req/sec)…');
    let totalPlayers = 0;
    for (const entry of apiTeams) {
      const teamId = entry.team.id;
      const teamName = entry.team.name;
      try {
        const squadData = await apiFetch(`/players/squads?team=${teamId}`);
        const squads = squadData.response || [];
        const playerRows = [];
        for (const squad of squads) {
          for (const pl of squad.players || []) {
            playerRows.push({
              api_id: String(pl.id),
              team_api_id: String(teamId),
              name: pl.name,
              position: pl.position || null,
              number: pl.number || null,
              photo_url: pl.photo || null,
            });
          }
        }
        if (playerRows.length > 0) {
          const { error } = await supabase
            .from('players')
            .upsert(playerRows, { onConflict: 'api_id' });
          if (error) console.error(`  Players upsert error (${teamName}):`, error.message);
          else {
            totalPlayers += playerRows.length;
            process.stdout.write(`  ✓ ${teamName} — ${playerRows.length} players\n`);
          }
        } else {
          console.log(`  ⚠ ${teamName} — no squad data`);
        }
      } catch (e) {
        console.error(`  ✗ ${teamName}: ${e.message}`);
      }
      await sleep(1100); // throttle: 1 req/sec
    }
    console.log(`\n  ✓ Total players upserted: ${totalPlayers}`);
  }

  // ── 4. Fetch & upsert fixtures ───────────────────────────────────────────
  console.log('\n📅 Fetching fixtures…');
  const fixturesData = await apiFetch(`/fixtures?league=${LEAGUE_ID}&season=${WC_SEASON}`);
  const apiFixtures = fixturesData.response || [];
  console.log(`  Found ${apiFixtures.length} fixtures.`);

  if (apiFixtures.length > 0) {
    const fixtureRows = apiFixtures.map((f) => ({
      api_id: String(f.fixture.id),
      home_team_api_id: String(f.teams.home.id),
      away_team_api_id: String(f.teams.away.id),
      home_score: f.goals?.home ?? null,
      away_score: f.goals?.away ?? null,
      status: f.fixture.status?.short || 'NS',
      kickoff_at: f.fixture.date || null,
    }));

    // Batch upsert in chunks of 100
    const CHUNK = 100;
    for (let i = 0; i < fixtureRows.length; i += CHUNK) {
      const chunk = fixtureRows.slice(i, i + CHUNK);
      const { error } = await supabase
        .from('fixtures')
        .upsert(chunk, { onConflict: 'api_id' });
      if (error) console.error(`  Fixtures upsert error (chunk ${i}):`, error.message);
    }
    console.log(`  ✓ Upserted ${fixtureRows.length} fixtures.`);
  }

  console.log('\n✅ Backfill complete.\n');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
