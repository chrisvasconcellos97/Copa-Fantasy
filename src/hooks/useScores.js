import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useScores(gameId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let channel;

    async function loadScores() {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_scores')
        .select('*')
        .eq('game_id', gameId)
        .order('total_points', { ascending: false });
      if (!error && data) setScores(data);
      setLoading(false);
    }

    loadScores();

    channel = supabase
      .channel(`scores-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        () => {
          loadScores();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        () => {
          loadScores();
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { scores, loading };
}
