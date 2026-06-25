import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function fetchAllFixtures() {
  const allEvents: unknown[] = [];
  const startDate = new Date("2026-06-11");
  const endDate = new Date("2026-07-20");
  let cursor = new Date(startDate);
  while (cursor <= endDate) {
    const next = new Date(cursor);
    next.setDate(next.getDate() + 7);
    const from = cursor.toISOString().slice(0, 10).replace(/-/g, "");
    const to = (next > endDate ? endDate : next).toISOString().slice(0, 10).replace(/-/g, "");
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=${from}-${to}&limit=100`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (res.ok) {
      const data = await res.json() as { events?: unknown[] };
      allEvents.push(...(data.events ?? []));
    }
    cursor = next;
    cursor.setDate(cursor.getDate() + 1);
  }
  const seen = new Set<string>();
  return (allEvents as Array<{ id: string } & Record<string, unknown>>).filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

function mapRow(ev: {
  id: string;
  season?: { slug?: string };
  competitions: Array<{
    id: string;
    date: string;
    status: { displayClock: string; period: number; type: { short?: string; state: string; completed: boolean; description: string; detail?: string } };
    competitors: Array<{ id: string; homeAway: string; team: { id: string; displayName: string; logo: string }; score?: string; winner?: boolean }>;
    groups?: { shortName?: string };
  }>;
}) {
  const comp = ev.competitions[0];
  const home = comp.competitors.find((c) => c.homeAway === "home");
  const away = comp.competitors.find((c) => c.homeAway === "away");
  const st = comp.status.type;
  const homeGoals = home?.score !== undefined ? parseInt(home.score, 10) : null;
  const awayGoals = away?.score !== undefined ? parseInt(away.score, 10) : null;
  const isLiveOrDone = st.completed || st.state === 'in';
  const hasScore = isLiveOrDone && homeGoals !== null && awayGoals !== null;
  const elapsedStr = comp.status.displayClock;
  const elapsed = st.state === 'in' && comp.status.period > 0 ? (parseInt(elapsedStr) || null) : null;
  return {
    api_id: parseInt(ev.id, 10),
    round: comp.groups?.shortName ?? ev.season?.slug ?? "Group Stage",
    status_short: st.detail ?? st.short ?? st.state,
    status_long: st.description,
    elapsed,
    kickoff: comp.date,
    home_team_api_id: parseInt(home?.team.id ?? "0", 10),
    away_team_api_id: parseInt(away?.team.id ?? "0", 10),
    home_team_name: home?.team.displayName ?? null,
    away_team_name: away?.team.displayName ?? null,
    home_logo_url: home?.team.logo ?? null,
    away_logo_url: away?.team.logo ?? null,
    home_goals: hasScore ? homeGoals : null,
    away_goals: hasScore ? awayGoals : null,
    winner_api_id: home?.winner ? parseInt(home.team.id, 10)
      : away?.winner ? parseInt(away.team.id, 10)
      : null,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const debug = url.searchParams.get("debug") === "1";
  const force = url.searchParams.get("force") === "1";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (!force && !debug) {
    // Only run if a match is live or starting within 30 min or finished within the last 3 hours
    const now = new Date();
    const windowStart = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    const windowEnd = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("fixtures")
      .select("id", { count: "exact", head: true })
      .or(`elapsed.not.is.null,kickoff.gte.${windowStart}`)
      .lte("kickoff", windowEnd);
    if ((count ?? 0) === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "No active or imminent matches" }), {
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    const events = await fetchAllFixtures();
    if (debug) {
      return new Response(JSON.stringify({ count: events.length, sample: events.slice(0, 1) }, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }
    if (events.length === 0) {
      return new Response(JSON.stringify({ error: "No fixtures from ESPN" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }
    const rows = events.map(mapRow);
    const { error } = await supabase.from("fixtures").upsert(rows, { onConflict: "api_id" });
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, fixtures_synced: rows.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
});
