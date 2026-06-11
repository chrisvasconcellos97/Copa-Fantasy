import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let mounted = true;

    async function fetchPlayers() {
      const { data, error } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('joined_at', { ascending: true });
      if (mounted) {
        if (!error) setPlayers(data || []);
        setLoading(false);
      }
    }

    fetchPlayers();

    const channel = supabase
      .channel(`game-players-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (mounted) setPlayers(prev => [...prev, payload.new]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'game_players', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (mounted) setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { players, loading };
}
