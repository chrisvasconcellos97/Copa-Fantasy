import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useDraft(gameId) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;

    let mounted = true;

    async function fetchPicks() {
      const { data, error } = await supabase
        .from('draft_picks')
        .select('*')
        .eq('game_id', gameId)
        .order('pick_number', { ascending: true });
      if (mounted) {
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
          if (mounted) {
            setPicks(prev => {
              const exists = prev.some(p => p.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new].sort((a, b) => a.pick_number - b.pick_number);
            });
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { picks, loading };
}
