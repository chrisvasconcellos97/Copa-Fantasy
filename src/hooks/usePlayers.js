import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let channel;

    async function loadPlayers() {
      setLoading(true);
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true });
      if (!error && data) setPlayers(data);
      setLoading(false);
    }

    loadPlayers();

    channel = supabase
      .channel(`players-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          setPlayers((prev) => {
            if (prev.find((p) => p.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { players, loading };
}
