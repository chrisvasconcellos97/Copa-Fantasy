import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase.js';

export function useDraft(gameId) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!gameId) { setLoading(false); return; }

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
        { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: `game_id=eq.${gameId}` },
        (payload) => {
          if (!cancelled) {
            setPicks((prev) => {
              const exists = prev.find((p) => p.id === payload.new.id);
              if (exists) return prev;
              return [...prev, payload.new].sort((a, b) => a.pick_number - b.pick_number);
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return { picks, loading };
}
