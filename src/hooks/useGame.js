import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useGame(gameId) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    let sub;

    async function load() {
      const { data } = await supabase.from('games').select('*').eq('id', gameId).single();
      setGame(data);
      setLoading(false);
    }
    load();

    sub = supabase.channel('game-' + gameId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: 'id=eq.' + gameId },
        (p) => setGame(p.new))
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [gameId]);

  return { game, loading };
}
