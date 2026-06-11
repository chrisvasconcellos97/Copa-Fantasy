import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { syncFixtures } from '../lib/syncFixtures'

const POLL_MS = 30 * 60 * 1000 // 30 minutes

export function useLiveSync() {
  const timerRef = useRef(null)

  useEffect(() => {
    async function poll() {
      try { await syncFixtures(supabase) } catch (e) { console.warn('Sync failed:', e.message) }
    }
    poll() // immediate first run
    timerRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [])
}
