import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gameId) { setLoading(false); return }

    supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .order('draft_order', { ascending: true })
      .then(({ data }) => {
        setPlayers(data || [])
        setLoading(false)
      })

    const channel = supabase
      .channel('game_players:' + gameId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_players', filter: 'game_id=eq.' + gameId },
        () => {
          supabase
            .from('game_players')
            .select('*')
            .eq('game_id', gameId)
            .order('draft_order', { ascending: true })
            .then(({ data }) => setPlayers(data || []))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'game_players', filter: 'game_id=eq.' + gameId },
        () => {
          supabase
            .from('game_players')
            .select('*')
            .eq('game_id', gameId)
            .order('draft_order', { ascending: true })
            .then(({ data }) => setPlayers(data || []))
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  return { players, loading }
}
