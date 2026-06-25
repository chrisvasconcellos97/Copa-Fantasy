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

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
