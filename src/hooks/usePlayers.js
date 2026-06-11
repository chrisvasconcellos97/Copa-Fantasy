import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Loads game_players for a given game and subscribes to realtime changes.
 * @param {string} gameId
 * @returns {{ players: Array, loading: boolean }}
 */
export function usePlayers(gameId) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true });
      if (!cancelled) {
        if (!error) setPlayers(data || []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`players-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (!cancelled) {
            setPlayers((prev) => {
              if (prev.find((p) => p.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (!cancelled) {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { players, loading };
}
