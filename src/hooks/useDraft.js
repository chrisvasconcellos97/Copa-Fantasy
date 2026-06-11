import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useDraft(gameId) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let channel;

    async function loadPicks() {
      setLoading(true);
      const { data, error } = await supabase
        .from('draft_picks')
        .select('*')
        .eq('game_id', gameId)
        .order('pick_number', { ascending: true });
      if (!error && data) setPicks(data);
      setLoading(false);
    }

    loadPicks();

    channel = supabase
      .channel(`draft-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `game_id=eq.${gameId}` },
        (payload) => {
          setPicks((prev) => {
            if (prev.find((p) => p.id === payload.new.id)) return prev;
            const next = [...prev, payload.new];
            next.sort((a, b) => a.pick_number - b.pick_number);
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { picks, loading };
}
