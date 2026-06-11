import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useScores(gameId) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gameId) { setLoading(false); return }

    supabase
      .from('user_scores')
      .select('*')
      .eq('game_id', gameId)
      .order('total_points', { ascending: false })
      .then(({ data }) => {
        setScores(data || [])
        setLoading(false)
      })

    const channel = supabase
      .channel('user_scores:' + gameId)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_scores', filter: 'game_id=eq.' + gameId },
        () => {
          supabase
            .from('user_scores')
            .select('*')
            .eq('game_id', gameId)
            .order('total_points', { ascending: false })
            .then(({ data }) => setScores(data || []))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  return { scores, loading }
}
