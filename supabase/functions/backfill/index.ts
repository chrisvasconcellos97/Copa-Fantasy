import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const API_KEY = "1e60025d01a19a0d02428500673187e4";
const ORIGIN = "https://copa-fantasy-psi.vercel.app";
const LEAGUE = 1;
const SEASON = 2026;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromApiFootball(path: string): Promise<unknown> {
  const url = `${API_FOOTBALL_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": API_KEY,
      "Origin": ORIGIN,
    },
  });
  if (!res.ok) {
    throw new Error(`API-Football request failed: ${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

Deno.serve(async (req: Request) => {
  // Auth check
  const backfillSecret = Deno.env.get("BACKFILL_SECRET");
  const providedKey = req.headers.get("x-backfill-key");
  if (!backfillSecret || providedKey !== backfillSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Step 1: Fetch all teams for league 1, season 2026
    const teamsData = await fetchFromApiFootball(
      `/teams?league=${LEAGUE}&season=${SEASON}`
    ) as { response: Array<{ team: { id: number; name: string } }> };

    const teams = teamsData.response ?? [];
    if (teams.length === 0) {
      return new Response(
        JSON.stringify({ error: "No teams found", league: LEAGUE, season: SEASON }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    let totalUpserted = 0;
    const errors: string[] = [];

    // Step 2: For each team, fetch squad and upsert players
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i].team;
      const teamId = team.id;

      // Rate limit: sleep 1100ms between requests (except before first)
      if (i > 0) {
        await sleep(1100);
      }

      let squadData: {
        response: Array<{
          team: { id: number };
          players: Array<{
            id: number;
            name: string;
            position: string;
            photo: string;
            number: number | null;
          }>;
        }>;
      };

      try {
        squadData = await fetchFromApiFootball(
          `/players/squads?team=${teamId}`
        ) as typeof squadData;
      } catch (err) {
        const msg = `Failed to fetch squad for team ${teamId} (${team.name}): ${err}`;
        console.error(msg);
        errors.push(msg);
        continue;
      }

      const squadResponse = squadData.response ?? [];
      if (squadResponse.length === 0) {
        continue;
      }

      const players = squadResponse[0].players ?? [];

      // Build upsert rows
      const rows = players.map((p) => ({
        api_id: String(p.id),
        team_api_id: String(teamId),
        name: p.name,
        position: p.position,
        photo_url: p.photo,
        number: p.number ?? null,
      }));

      if (rows.length === 0) continue;

      // Step 3: Upsert into players table
      const { error: upsertError } = await supabase
        .from("players")
        .upsert(rows, { onConflict: "api_id" });

      if (upsertError) {
        const msg = `Upsert error for team ${teamId} (${team.name}): ${upsertError.message}`;
        console.error(msg);
        errors.push(msg);
      } else {
        totalUpserted += rows.length;
        console.log(`Upserted ${rows.length} players for team ${teamId} (${team.name})`);
      }
    }

    // Step 4: Return JSON summary
    return new Response(
      JSON.stringify({
        success: true,
        teams_processed: teams.length,
        players_upserted: totalUpserted,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Backfill failed:", err);
    return new Response(
      JSON.stringify({ error: "Backfill failed", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
