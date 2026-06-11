import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let isMounted = true;

    async function fetchPlayers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true });
      if (isMounted) {
        if (!error) setPlayers(data || []);
        setLoading(false);
      }
    }

    fetchPlayers();

    const channel = supabase
      .channel(`game_players:${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (isMounted) {
            setPlayers((prev) => {
              const exists = prev.find((p) => p.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new];
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (isMounted) {
            setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { players, loading };
}
