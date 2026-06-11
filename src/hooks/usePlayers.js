import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePlayers(gameId) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;
    supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true })
      .then(({ data }) => {
        if (!cancelled) {
          setPlayers(data || []);
          setLoading(false);
        }
      });

    const channel = supabase
      .channel(`players-${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`,
      }, (payload) => {
        setPlayers(prev => [...prev, payload.new]);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${gameId}`,
      }, (payload) => {
        setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { players, loading };
}
