import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const KNOWN_STARS: Set<string> = new Set([
  "lionel messi", "julian alvarez", "rodrigo de paul",
  "vinicius junior", "neymar", "rodrygo", "raphinha", "casemiro", "bruno guimaraes", "endrick",
  "kylian mbappe", "antoine griezmann", "aurelien tchouameni", "ousmane dembele",
  "jude bellingham", "harry kane", "bukayo saka", "phil foden", "trent alexander-arnold",
  "pedri", "gavi", "lamine yamal", "alvaro morata", "dani olmo",
  "florian wirtz", "jamal musiala", "kai havertz", "toni kroos",
  "cristiano ronaldo", "bernardo silva", "bruno fernandes", "joao felix", "ruben dias",
  "virgil van dijk", "cody gakpo", "xavi simons", "memphis depay",
  "kevin de bruyne", "romelu lukaku", "thibaut courtois",
  "hirving lozano", "raul jimenez", "santiago gimenez",
  "christian pulisic", "tyler adams", "gio reyna", "weston mckennie",
  "alphonso davies", "jonathan david", "cyle larin",
  "achraf hakimi", "hakim ziyech", "youssef en-nesyri", "sofyan amrabat",
  "james rodriguez", "luis diaz", "jhon cordoba", "davinson sanchez",
  "darwin nunez", "federico valverde", "rodrigo bentancur", "luis suarez",
  "takefusa kubo", "kaoru mitoma", "daichi kamada", "ritsu doan",
  "son heung-min", "lee kang-in", "kim min-jae",
  "luka modric", "ivan perisic", "mateo kovacic", "andrej kramaric",
  "granit xhaka", "xherdan shaqiri", "breel embolo", "yann sommer",
  "sadio mane", "edouard mendy", "idrissa gueye",
  "enner valencia", "moises caicedo",
  "david alaba", "marko arnautovic", "christoph baumgartner",
  "andrew robertson", "scott mctominay", "kieran tierney",
  "erling haaland", "martin odegaard", "alexander sorloth",
  "salem al-dawsari", "mohammed al-owais",
  "thomas partey", "jordan ayew", "andre ayew",
  "alexander isak", "viktor gyokeres", "dejan kulusevski",
  "hakan calhanoglu", "arda guler", "kerem akturkoglu",
  "patrik schick", "tomas soucek", "vladimir coufal",
  "mehdi taremi", "sardar azmoun",
  "akram afif", "almoez ali",
  "ivan toney", "cole palmer",
]);

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+null$/i, "")
    .trim();
}

function normalizePos(abbr: string): string {
  const p = (abbr ?? "").toUpperCase().trim();
  if (["GK", "G", "GOALKEEPER"].includes(p)) return "GK";
  if (["CB", "LB", "RB", "LWB", "RWB", "SW", "DEF", "D", "WB"].includes(p)) return "DEF";
  if (["ST", "CF", "LW", "RW", "FWD", "F", "SS", "W"].includes(p)) return "FWD";
  return "MID";
}

type Athlete = { id: string; fullName?: string; displayName?: string; position?: { abbreviation: string }; headshot?: { href: string } };

async function fetchRoster(espnTeamId: number): Promise<Athlete[]> {
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/${espnTeamId}/roster`);
  if (!res.ok) return [];
  const data = await res.json() as { athletes?: Athlete[] };
  return data.athletes ?? [];
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: teams, error: teamsErr } = await supabase.from("teams").select("api_id, name").order("name");
  if (teamsErr) return new Response(JSON.stringify({ error: teamsErr.message }), { status: 500 });

  // Fetch existing FC26 photos so we don't overwrite them
  const { data: existingPlayers } = await supabase
    .from("players")
    .select("api_id, photo_url")
    .like("photo_url", "%sofifa%");
  const fc26Photos = new Map<string, string>();
  for (const p of existingPlayers ?? []) {
    fc26Photos.set(String(p.api_id), p.photo_url);
  }

  const results = await Promise.all(
    (teams ?? []).map(async (team) => ({ team, athletes: await fetchRoster(team.api_id) }))
  );

  const allRows = results.flatMap(({ team, athletes }) => {
    const byPos: Record<string, string[]> = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const a of athletes) {
      const pos = normalizePos(a.position?.abbreviation ?? "");
      byPos[pos].push(a.id);
    }
    const fallbackStars = new Set([
      ...byPos.GK.slice(0, 2),
      ...byPos.DEF.slice(0, 3),
      ...byPos.MID.slice(0, 3),
      ...byPos.FWD.slice(0, 2),
    ]);

    return athletes.map((a) => {
      const rawName = a.displayName ?? a.fullName ?? "";
      const normalized = normalizeName(rawName);
      const isKnownStar = KNOWN_STARS.has(normalized);
      const isFallbackStar = fallbackStars.has(a.id);
      // Preserve FC26 photo if already set
      const photo = fc26Photos.get(String(a.id)) ?? a.headshot?.href ?? null;
      return {
        api_id: String(a.id),
        team_api_id: String(team.api_id),
        name: rawName.replace(/\s+null$/i, "").trim(),
        position: normalizePos(a.position?.abbreviation ?? ""),
        photo_url: photo,
        number: null,
        is_top: isKnownStar || isFallbackStar,
      };
    });
  });

  const noRoster = results.filter(r => r.athletes.length === 0).map(r => r.team.name);

  if (allRows.length === 0) {
    return new Response(JSON.stringify({ error: "No players fetched", no_roster: noRoster }), { status: 500 });
  }

  const { error } = await supabase.from("players").upsert(allRows, { onConflict: "api_id" });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  return new Response(JSON.stringify({ success: true, players_synced: allRows.length, no_roster: noRoster.length ? noRoster : undefined }), {
    headers: { "Content-Type": "application/json" },
  });
});
