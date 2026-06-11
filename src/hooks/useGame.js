import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

export function useGame(gameId) {
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!gameId) { setLoading(false); return; }

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
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          if (!cancelled) setGame(payload.new);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { game, loading };
}
