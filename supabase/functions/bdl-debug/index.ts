const BDL_KEY = 'ab532912-1f8b-42f9-8f34-fe7cbf642fa2';

Deno.serve(async () => {
  const res = await fetch('https://api.balldontlie.io/fifa/worldcup/v1/matches?seasons[]=2026&per_page=200', {
    headers: { 'Authorization': BDL_KEY },
  });
  const data = await res.json();

  // Also fetch events for one match to see structure
  let sampleEvents = null;
  if (data?.data?.length > 0) {
    const firstMatch = data.data[0];
    const evRes = await fetch(`https://api.balldontlie.io/fifa/worldcup/v1/match_events?match_id=${firstMatch.id}&per_page=200`, {
      headers: { 'Authorization': BDL_KEY },
    });
    sampleEvents = await evRes.json();
  }

  return new Response(JSON.stringify({ matches: data, sampleEvents }, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
});
