import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function normalize(name: string) {
  return name.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "").trim();
}

async function searchSportsDB(name: string): Promise<string | null> {
  const encoded = encodeURIComponent(name);
  const res = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encoded}`);
  if (!res.ok) return null;
  const data = await res.json() as { player?: Array<{ strPlayer: string; strThumb?: string; strCutout?: string }> };
  if (!data.player || data.player.length === 0) return null;
  const normTarget = normalize(name);
  const match = data.player.find(p => normalize(p.strPlayer) === normTarget)
    ?? data.player.find(p => { const n = normalize(p.strPlayer); return n.includes(normTarget) || normTarget.includes(n); });
  if (!match) return null;
  return match.strThumb || match.strCutout || null;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  // Pass team_ids as comma-separated: ?team_ids=202,205,448,478,481,482,164,449,459
  const teamIdsParam = url.searchParams.get("team_ids");
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const limit = parseInt(url.searchParams.get("limit") ?? "150");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let query = supabase.from("players").select("api_id, name").is("photo_url", null).order("name");

  if (teamIdsParam) {
    const ids = teamIdsParam.split(",").map(s => s.trim());
    query = query.in("team_api_id", ids);
  }

  const { data: players, error } = await query.range(offset, offset + limit - 1);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!players || players.length === 0) {
    return new Response(JSON.stringify({ done: true, message: "No more players without photos" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let updated = 0;
  let notFound = 0;

  for (const player of players) {
    const photoUrl = await searchSportsDB(player.name);
    if (photoUrl) {
      await supabase.from("players").update({ photo_url: photoUrl }).eq("api_id", player.api_id);
      updated++;
    } else {
      notFound++;
    }
    await sleep(200);
  }

  return new Response(JSON.stringify({
    success: true,
    processed: players.length,
    updated,
    not_found: notFound,
    next_offset: offset + limit,
    has_more: players.length === limit,
  }), { headers: { "Content-Type": "application/json" } });
});
