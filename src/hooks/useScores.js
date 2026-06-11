import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useScores(gameId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let isMounted = true;

    async function loadScores() {
      const { data, error } = await supabase
        .from('user_scores')
        .select('*')
        .eq('game_id', gameId)
        .order('total_points', { ascending: false });
      if (isMounted) {
        if (!error && data) setScores(data);
        setLoading(false);
      }
    }

    loadScores();

    const channel = supabase
      .channel(`user-scores-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (isMounted) {
            setScores((prev) => {
              const updated = prev.map((s) =>
                s.id === payload.new.id ? payload.new : s
              );
              updated.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (isMounted) {
            setScores((prev) => {
              if (prev.find((s) => s.id === payload.new.id)) return prev;
              const next = [...prev, payload.new];
              next.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
              return next;
            });
          }
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
