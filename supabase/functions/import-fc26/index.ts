import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const players: Array<{ api_id: number; photo_url: string; is_top: boolean }> = await req.json();

  let updated = 0;
  // Process in batches of 50
  for (let i = 0; i < players.length; i += 50) {
    const batch = players.slice(i, i + 50);
    await Promise.all(batch.map(p =>
      supabase.from('players')
        .update({ photo_url: p.photo_url, is_top: p.is_top })
        .eq('api_id', p.api_id)
    ));
    updated += batch.length;
  }

  return new Response(JSON.stringify({ success: true, updated }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
