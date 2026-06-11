import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

export function useScores(gameId) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!gameId) { setLoading(false); return; }

    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_scores')
        .select('*, game_players(player_name, is_host)')
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
        { event: 'UPDATE', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        () => {
          if (!cancelled) load();
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_scores', filter: `game_id=eq.${gameId}` },
        () => {
          if (!cancelled) load();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { scores, loading };
}
