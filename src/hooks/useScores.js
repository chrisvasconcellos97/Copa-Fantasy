import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Loads user_scores for a game, ordered by total_points desc.
 * Subscribes to realtime updates.
 * @param {string} gameId
 * @returns {{ scores: Array, loading: boolean }}
 */
export function useScores(gameId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_scores')
        .select('*')
        .eq('game_id', gameId)
        .order('total_points', { ascending: false });
      if (!cancelled) {
        if (!error) setScores(data || []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`scores-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_scores',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (cancelled) return;
          setScores((prev) => {
            const next = prev.map((s) =>
              s.id === payload.new.id ? payload.new : s
            );
            next.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
            return next;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_scores',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (cancelled) return;
          setScores((prev) => {
            if (prev.find((s) => s.id === payload.new.id)) return prev;
            const next = [...prev, payload.new];
            next.sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { scores, loading };
}
