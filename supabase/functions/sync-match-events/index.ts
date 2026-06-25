import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ESPNEvent = {
  id: string;
  type: { type: string; text: string };
  clock: { value: number; displayValue: string };
  period: { number: number };
  team?: { id: string };
  participants?: Array<{ athlete: { id: string; displayName: string }; type?: { description?: string } }>;
};

async function fetchKeyEvents(espnFixtureId: number): Promise<ESPNEvent[]> {
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${espnFixtureId}`);
  if (!res.ok) return [];
  const data = await res.json() as { keyEvents?: ESPNEvent[] };
  return data.keyEvents ?? [];
}

function mapEventType(espnType: string): string | null {
  switch (espnType) {
    case 'goal': return 'goal';
    case 'own-goal': return 'own_goal';
    case 'yellow-card': return 'yellow_card';
    case 'red-card': return 'red_card';
    case 'yellow-red-card': return 'red_card';
    case 'penalty-scored': return 'goal';
    case 'penalty-missed': return null;
    case 'penalty-saved': return 'penalty_save';
    default: return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: fixtures, error: fixErr } = await supabase
    .from("fixtures")
    .select("api_id, id")
    .or("elapsed.not.is.null,and(status_short.eq.FT,events_synced.eq.false)");

  if (fixErr) return new Response(JSON.stringify({ error: fixErr.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (!force && (!fixtures || fixtures.length === 0)) {
    return new Response(JSON.stringify({ skipped: true, reason: "No active or unsynced matches" }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const results = await Promise.all(
    (fixtures ?? []).map(async (f) => ({
      fixtureId: f.api_id as number,
      fixtureUuid: f.id as string,
      events: await fetchKeyEvents(f.api_id),
    }))
  );

  const rows: Record<string, unknown>[] = [];
  const syncedUuids: string[] = [];

  for (const { fixtureId, fixtureUuid, events } of results) {
    for (const ev of events) {
      const eventType = mapEventType(ev.type.type);
      if (!eventType) continue;
      if (!ev.participants || ev.participants.length === 0) continue;

      const primary = ev.participants[0];
      const secondary = ev.participants[1] ?? null;
      const minute = Math.floor(ev.clock.value / 60) || null;

      rows.push({
        fixture_api_id: fixtureId,
        team_api_id: ev.team?.id ? parseInt(ev.team.id, 10) : null,
        player_api_id: parseInt(primary.athlete.id, 10),
        assist_api_id: eventType === 'goal' && secondary ? parseInt(secondary.athlete.id, 10) : null,
        type: eventType,
        detail: ev.type.text,
        elapsed: minute,
        dedupe_key: `${fixtureId}_${ev.id}_${eventType}`,
      });

      if (eventType === 'goal' && secondary) {
        rows.push({
          fixture_api_id: fixtureId,
          team_api_id: ev.team?.id ? parseInt(ev.team.id, 10) : null,
          player_api_id: parseInt(secondary.athlete.id, 10),
          assist_api_id: null,
          type: 'assist',
          detail: 'Assist',
          elapsed: minute,
          dedupe_key: `${fixtureId}_${ev.id}_assist`,
        });
      }
    }
    if (fixtureUuid) syncedUuids.push(fixtureUuid);
  }

  if (rows.length > 0) {
    const { error: upsertErr } = await supabase
      .from("match_events")
      .upsert(rows, { onConflict: "dedupe_key" });
    if (upsertErr) return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  if (syncedUuids.length > 0) {
    await supabase.from("fixtures").update({ events_synced: true }).in("id", syncedUuids).eq("status_short", "FT");
  }

  return new Response(JSON.stringify({
    success: true,
    fixtures_checked: fixtures?.length ?? 0,
    events_synced: rows.length,
  }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
});
