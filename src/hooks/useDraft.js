import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useDraft(gameId) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let isMounted = true;

    async function fetchPicks() {
      const { data, error } = await supabase
        .from('draft_picks')
        .select('*')
        .eq('game_id', gameId)
        .order('pick_number', { ascending: true });
      if (isMounted) {
        if (!error) setPicks(data || []);
        setLoading(false);
      }
    }

    fetchPicks();

    const channel = supabase
      .channel(`draft-picks-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (isMounted) {
            setPicks((prev) => {
              const exists = prev.some((p) => p.id === payload.new.id);
              if (exists) return prev;
              const next = [...prev, payload.new];
              next.sort((a, b) => a.pick_number - b.pick_number);
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { picks, loading };
}
