import { createClient } from '@supabase/supabase-js';

// Config comes from Vite env vars when provided (set VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY in .env or the host's env), falling back to the
// current project so existing deploys keep working without configuration.
// The anon key is a public, RLS-gated client key — safe to ship to the browser.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://hmasaapwbhxueuhxxqkd.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYXNhYXB3Ymh4dWV1aHh4cWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI1OTgsImV4cCI6MjA5NjM4ODU5OH0.pAdFowezL_l7QLLA0Y4KgyGAcDbYtx0OppA_id1agdY';

export const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Per-player JWT (minted by the auth-issue edge function). Held in memory and
// handed to supabase-js via the accessToken callback below, which uses it for
// both REST (Authorization) and Realtime. When null, supabase-js falls back to
// the anon key, so the app still works pre-cutover.
let _authJwt = null;
export function getAuthJwt() { return _authJwt; }

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  accessToken: async () => _authJwt,
});

export function setAuthJwt(jwt) {
  _authJwt = jwt || null;
  // Push the token to the Realtime socket so already-open channels re-authorize
  // under the new identity (RLS on postgres_changes uses this token).
  try { supabase.realtime.setAuth(_authJwt ?? SUPABASE_ANON_KEY); } catch { /* noop */ }
}
