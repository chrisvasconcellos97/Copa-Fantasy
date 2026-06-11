import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    let sub;

    async function load() {
      const { data } = await supabase.from('game_players').select('*').eq('game_id', gameId).order('draft_order', { nullsFirst: false });
      setPlayers(data || []);
      setLoading(false);
    }
    load();

    sub = supabase.channel('players-' + gameId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players', filter: 'game_id=eq.' + gameId },
        () => load())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [gameId]);

  return { players, loading };
}
