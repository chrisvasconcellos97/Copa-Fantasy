import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    supabase.from('game_players').select('*').eq('game_id', gameId)
      .then(({ data }) => { setPlayers(data || []); setLoading(false); });

    const channel = supabase.channel(`players-${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}`
      }, payload => setPlayers(prev => [...prev, payload.new]))
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}`
      }, payload => setPlayers(prev => prev.filter(p => p.id !== payload.old.id)))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}`
      }, payload => setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new : p)))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [gameId]);

  return { players, loading };
}
