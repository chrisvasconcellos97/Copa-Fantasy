import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://hmasaapwbhxueuhxxqkd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtYXNhYXB3Ymh4dWV1aHh4cWtkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MTI1OTgsImV4cCI6MjA5NjM4ODU5OH0.pAdFowezL_l7QLLA0Y4KgyGAcDbYtx0OppA_id1agdY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
