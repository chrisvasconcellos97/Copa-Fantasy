import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Loads a game row by id and subscribes to realtime updates.
 * @param {string} gameId
 * @returns {{ game: object|null, loading: boolean }}
 */
export function useGame(gameId) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
      if (!cancelled) {
        if (!error) setGame(data);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          if (!cancelled) setGame(payload.new);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { game, loading };
}
