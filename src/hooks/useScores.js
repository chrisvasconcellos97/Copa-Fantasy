import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useScores(gameId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let isMounted = true;

    async function fetchScores() {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_scores')
        .select('*, game_players(player_name, is_host)')
        .eq('game_id', gameId)
        .order('total_points', { ascending: false });
      if (isMounted) {
        if (!error) setScores(data || []);
        setLoading(false);
      }
    }

    fetchScores();

    const channel = supabase
      .channel(`user_scores:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        () => {
          if (isMounted) fetchScores();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        () => {
          if (isMounted) fetchScores();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { scores, loading };
}
