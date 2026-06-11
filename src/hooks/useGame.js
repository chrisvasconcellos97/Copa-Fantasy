import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useGame(gameId) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    supabase.from('games').select('*').eq('id', gameId).single()
      .then(({ data }) => { setGame(data); setLoading(false); });

    const channel = supabase.channel(`game-${gameId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}`
      }, payload => setGame(payload.new))
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [gameId]);

  return { game, loading };
}
