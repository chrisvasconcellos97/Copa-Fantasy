// auth-issue: mint a per-player signed JWT from a player's secret token.
//
// The app has no Supabase Auth — every request is the anon role with a random
// token in localStorage. This function verifies that token against the secrets
// table and returns a short-lived JWT whose claims (player_id, game_id, is_host)
// let Postgres RLS policies and SECURITY DEFINER RPCs identify the caller.
//
// DEPLOY WITH verify_jwt = false (this is the entry point that issues JWTs; it
// authenticates via the player token in the body, not an incoming JWT).
//
// REQUIRES a function secret SUPABASE_JWT_SECRET set to the project's JWT secret
// (Project Settings → API → JWT Secret), so the tokens we mint are accepted by
// PostgREST/Realtime:
//   supabase secrets set SUPABASE_JWT_SECRET=<project jwt secret>

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET');

async function getKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  if (!JWT_SECRET) return json({ error: 'Server not configured: SUPABASE_JWT_SECRET missing' }, 500);

  const { token } = await req.json().catch(() => ({})) as { token?: string };
  if (!token) return json({ error: 'token required' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Resolve the token -> game_player. Prefer the secrets table; fall back to the
  // legacy game_players.token column so this works at every point in the rollout
  // (before backfill, after backfill, and after the column is dropped).
  const { data: secret } = await supabase
    .from('player_secrets')
    .select('game_player_id')
    .eq('token', token)
    .maybeSingle();

  let gamePlayerId = secret?.game_player_id as string | undefined;
  if (!gamePlayerId) {
    const { data: gp } = await supabase
      .from('game_players')
      .select('id')
      .eq('token', token)
      .maybeSingle();
    gamePlayerId = gp?.id;
  }
  if (!gamePlayerId) return json({ error: 'invalid token' }, 401);

  const { data: player } = await supabase
    .from('game_players')
    .select('id, game_id, is_host, player_name')
    .eq('id', gamePlayerId)
    .single();
  if (!player) return json({ error: 'player not found' }, 404);

  const key = await getKey(JWT_SECRET);
  const jwt = await create(
    { alg: 'HS256', typ: 'JWT' },
    {
      role: 'authenticated',
      aud: 'authenticated',
      sub: player.id,
      player_id: player.id,
      game_id: player.game_id,
      is_host: player.is_host === true,
      iat: getNumericDate(0),
      exp: getNumericDate(60 * 60 * 24 * 30), // 30 days
    },
    key,
  );

  return json({
    jwt,
    player: {
      id: player.id,
      game_id: player.game_id,
      is_host: player.is_host === true,
      player_name: player.player_name,
    },
  });
});
