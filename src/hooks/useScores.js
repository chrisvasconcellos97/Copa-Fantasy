import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useScores(gameId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let mounted = true;

    async function fetchScores() {
      const { data, error } = await supabase
        .from('user_scores')
        .select('*, game_players(player_name, is_host)')
        .eq('game_id', gameId)
        .order('total_points', { ascending: false });
      if (mounted) {
        if (!error) setScores(data || []);
        setLoading(false);
      }
    }

    fetchScores();

    const channel = supabase
      .channel(`user-scores-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        () => {
          if (mounted) fetchScores();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        () => {
          if (mounted) fetchScores();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { scores, loading };
}
