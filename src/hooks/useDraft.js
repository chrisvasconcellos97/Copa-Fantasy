import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useDraft(gameId) {
  const [picks, setPicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) return;
    let sub;

    async function load() {
      const { data } = await supabase.from('draft_picks').select('*').eq('game_id', gameId).order('pick_number');
      setPicks(data || []);
      setLoading(false);
    }
    load();

    sub = supabase.channel('picks-' + gameId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'draft_picks', filter: 'game_id=eq.' + gameId },
        (p) => setPicks(prev => [...prev, p.new]))
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [gameId]);

  return { picks, loading };
}
