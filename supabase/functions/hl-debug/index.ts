const HL_KEY = '49b62db5-b66e-451f-8c98-7049ef090abd';
const HEADERS = { 'x-rapidapi-key': HL_KEY, 'x-rapidapi-host': 'soccer.highlightly.net' };

Deno.serve(async () => {
  const res = await fetch('https://soccer.highlightly.net/matches?date=2026-06-17', { headers: HEADERS });
  const raw = await res.json();
  if (raw?.message) return new Response(JSON.stringify({ rateLimited: true, msg: raw.message }), { headers: { 'Content-Type': 'application/json' } });

  const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);

  // Show all matches with their home/away team fields
  const matches = arr.map((m: Record<string, unknown>) => ({
    id: m.id,
    allKeys: Object.keys(m),
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    home: m.home,
    away: m.away,
    home_team: m.home_team,
    away_team: m.away_team,
  }));

  return new Response(JSON.stringify({ count: arr.length, matches }, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
