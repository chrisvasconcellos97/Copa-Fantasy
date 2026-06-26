// Test: do ESPN athlete IDs match our player api_ids?
// Using England vs Croatia (760437) which we know the expected players for
Deno.serve(async () => {
  const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=760437');
  const d = await r.json();

  const scoringPlays = d.scoringPlays ?? [];
  const keyEvents = d.keyEvents ?? [];

  // Show athlete IDs from scoring plays so we can compare to our known IDs
  // Kane=142200, Bellingham=291281, Baturina=311475, Musa=277128
  const spDetails = scoringPlays.map((ev: Record<string, unknown>) => ({
    type: (ev.type as Record<string,string>)?.type,
    text: (ev.type as Record<string,string>)?.text,
    clock: (ev.clock as Record<string,number>)?.value,
    team: (ev.team as Record<string,string>)?.id,
    athletes: ((ev.participants as {athlete:{id:string,displayName:string}}[]) ?? []).map(p => ({ id: p.athlete.id, name: p.athlete.displayName }))
  }));

  const keDetails = keyEvents.map((ev: Record<string, unknown>) => ({
    type: (ev.type as Record<string,string>)?.type,
    text: (ev.type as Record<string,string>)?.text,
    clock: (ev.clock as Record<string,number>)?.value,
    athletes: ((ev.participants as {athlete:{id:string,displayName:string}}[]) ?? []).map(p => ({ id: p.athlete.id, name: p.athlete.displayName }))
  }));

  return new Response(JSON.stringify({ scoringPlays: spDetails, keyEvents: keDetails }, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
});
