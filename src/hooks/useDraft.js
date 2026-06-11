import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Loads draft_picks for a game and subscribes to new picks in realtime.
 * @param {string} gameId
 * @returns {{ picks: Array, loading: boolean }}
 */
export function useDraft(gameId) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('draft_picks')
        .select('*')
        .eq('game_id', gameId)
        .order('pick_number', { ascending: true });
      if (!cancelled) {
        if (!error) setPicks(data || []);
        setLoading(false);
      }
    }

    load();

    const channel = supabase
      .channel(`draft-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'draft_picks',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          if (!cancelled) {
            setPicks((prev) => {
              if (prev.find((p) => p.id === payload.new.id)) return prev;
              const next = [...prev, payload.new];
              next.sort((a, b) => a.pick_number - b.pick_number);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { picks, loading };
}
