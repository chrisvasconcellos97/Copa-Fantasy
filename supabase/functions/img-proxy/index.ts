import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: Request) => {
  const url = new URL(req.url).searchParams.get('url');
  if (!url || !url.startsWith('https://cdn.sofifa.net/')) {
    return new Response('Bad Request', { status: 400 });
  }

  const resp = await fetch(url, {
    headers: { 'Referer': 'https://sofifa.com', 'User-Agent': 'Mozilla/5.0' },
  });

  const contentType = resp.headers.get('content-type') || 'image/png';
  const body = await resp.arrayBuffer();

  return new Response(body, {
    status: resp.status,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
