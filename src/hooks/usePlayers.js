import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!gameId) { setLoading(false); return; }

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
        { event: 'INSERT', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (!cancelled) setPlayers((prev) => [...prev, payload.new]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (!cancelled) setPlayers((prev) => prev.filter((p) => p.id !== payload.old.id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { players, loading };
}
