import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useScores(gameId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadScores = useCallback(async () => {
    if (!gameId) return;
    const { data, error } = await supabase
      .from('user_scores')
      .select('*')
      .eq('game_id', gameId)
      .order('total_points', { ascending: false });
    if (!error && data) setScores(data);
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;

    let isMounted = true;

    loadScores();

    // Poll every 30s as a fallback in case Realtime drops
    const poll = setInterval(() => { if (isMounted) loadScores(); }, 30000);

    const channel = supabase
      .channel(`user-scores-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        () => { if (isMounted) loadScores(); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        () => { if (isMounted) loadScores(); }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [gameId, loadScores]);

  return { scores, loading };
}
