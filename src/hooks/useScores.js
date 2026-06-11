import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useScores(gameId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    let sub;

    async function load() {
      const { data } = await supabase.from('user_scores').select('*, game_player:game_player_id(*)').eq('game_id', gameId).order('total_points', { ascending: false });
      setScores(data || []);
      setLoading(false);
    }
    load();

    sub = supabase.channel('scores-' + gameId)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_scores', filter: 'game_id=eq.' + gameId },
        () => load())
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [gameId]);

  return { scores, loading };
}
